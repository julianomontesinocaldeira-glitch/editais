// src/scrapers/cnpq.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital, ResultadoScraper } from "../types";
import { gerarId } from "../hash";

const INSTITUICAO = "CNPq";

export async function scraperCnpq(): Promise<ResultadoScraper> {
  const editaisMap = new Map<string, Edital>();

  const urls = [
    "https://www.gov.br/cnpq/pt-br/chamadas/abertas-para-submissao",
    "https://www.gov.br/cnpq/pt-br/assuntos/noticias/chamadas-e-selecoes",
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

      // Portal gov.br — artigos e listagens
      $("article, .tileItem, .summary-view-item, li").each((_, el) => {
        const tituloEl = $(el).find("h2 a, h3 a, a").first();
        const titulo = tituloEl.text().trim();
        const href = tituloEl.attr("href") ?? "";
        if (titulo.length < 10) return;

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

      // Fallback: links diretos
      if (editaisMap.size === 0) {
        $("a").each((_, el) => {
          const titulo = $(el).text().trim();
          const href = $(el).attr("href") ?? "";
          if (titulo.length < 15) return;
          if (!/(chamada|edital|seleção|bolsa|cnpq)/i.test(titulo)) return;

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

      if (editaisMap.size > 0) break;
    } catch (erro) {
      console.warn(`[cnpq] Erro em ${url}: ${erro}`);
    }
  }

  return { instituicao: INSTITUICAO, editais: Array.from(editaisMap.values()) };
}
