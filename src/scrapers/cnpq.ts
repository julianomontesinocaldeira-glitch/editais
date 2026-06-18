// src/scrapers/cnpq.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital, ResultadoScraper } from "../types";
import { gerarId } from "../hash";

const INSTITUICAO = "CNPq";

// Palavras que indicam que NÃO é um edital
const BLACKLIST = [
  "termos de uso", "governo digital", "política de", "privacidade",
  "acessibilidade", "mapa do site", "fale conosco", "ouvidoria",
  "sobre o portal", "conheça o portal", "elementos do portal",
  "secretaria", "ministério", "login", "entrar", "cadastro",
  "home", "início", "voltar", "menu"
];

// Palavras que confirmam que É um edital
const WHITELIST = [
  "chamada", "edital", "seleção", "bolsa", "auxílio", "cnpq",
  "pesquisa", "fomento", "programa", "oportunidade", "proposta",
  "submissão", "inscrição", "universal", "mcti", "produtividade"
];

function isEdital(texto: string): boolean {
  const lower = texto.toLowerCase();
  if (BLACKLIST.some(b => lower.includes(b))) return false;
  if (texto.length < 15 || texto.length > 300) return false;
  return WHITELIST.some(w => lower.includes(w));
}

export async function scraperCnpq(): Promise<ResultadoScraper> {
  const editaisMap = new Map<string, Edital>();

  const urls = [
    "https://www.gov.br/cnpq/pt-br/chamadas/abertas-para-submissao",
  ];

  for (const url of urls) {
    try {
      const { data } = await axios.get(url, {
        timeout: 20000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
      });
      const $ = cheerio.load(data);

      // Busca em artigos e itens de lista primeiro
      $("article, .tileItem, .summary-view-item").each((_, el) => {
        const tituloEl = $(el).find("h2 a, h3 a, a").first();
        const titulo = tituloEl.text().trim();
        const href = tituloEl.attr("href") ?? "";
        if (!isEdital(titulo)) return;

        const contexto = $(el).text().trim();
        const dataMatch = contexto.match(/(\d{2}\/\d{2}\/\d{4})/);
        const valorMatch = contexto.match(/R\$\s*[\d.,]+\s*(mil(hões?)?|bi(lhões?)?)?/i);

        editaisMap.set(gerarId(titulo, INSTITUICAO), {
          id: gerarId(titulo, INSTITUICAO),
          titulo,
          instituicao: INSTITUICAO,
          dataLimite: dataMatch ? dataMatch[0] : "Consulte o edital",
          valorFomento: valorMatch ? valorMatch[0] : "Consulte o edital",
          link: href.startsWith("http") ? href : `https://www.gov.br${href}`,
          descobertoEm: new Date().toISOString(),
        });
      });

      // Fallback: qualquer link que passe pelo filtro
      if (editaisMap.size === 0) {
        $("a").each((_, el) => {
          const titulo = $(el).text().trim();
          const href = $(el).attr("href") ?? "";
          if (!isEdital(titulo)) return;
          if (!href.includes("cnpq") && !href.includes("gov.br")) return;

          editaisMap.set(gerarId(titulo, INSTITUICAO), {
            id: gerarId(titulo, INSTITUICAO),
            titulo,
            instituicao: INSTITUICAO,
            dataLimite: "Consulte o edital",
            valorFomento: "Consulte o edital",
            link: href.startsWith("http") ? href : `https://www.gov.br${href}`,
            descobertoEm: new Date().toISOString(),
          });
        });
      }
    } catch (erro) {
      console.warn(`[cnpq] Erro: ${erro}`);
    }
  }

  return { instituicao: INSTITUICAO, editais: Array.from(editaisMap.values()) };
}
