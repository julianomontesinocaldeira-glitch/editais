// src/scrapers/finep.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital, ResultadoScraper } from "../types";
import { gerarId } from "../hash";

const INSTITUICAO = "Finep";

export async function scraperFinep(): Promise<ResultadoScraper> {
  const editaisMap = new Map<string, Edital>();

  const urls = [
    "https://www.finep.gov.br/chamadas-publicas?situacao=aberta",
    "https://www.finep.gov.br/chamadas-publicas",
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

      $("a").each((_, el) => {
        const texto = $(el).text().trim();
        const href = $(el).attr("href") ?? "";
        if (texto.length < 10) return;
        if (!/(chamada|edital|seleção|oportunidade|subvenção|inovação|inova|programa)/i.test(texto)) return;

        const contexto = $(el).closest("tr, li, div, article, .item").text().trim();
        const dataMatch = contexto.match(/(\d{2}\/\d{2}\/\d{4})/);
        const valorMatch = contexto.match(/R\$\s*[\d.,]+\s*(mil(hões?)?|bi(lhões?)?)?/i);

        editaisMap.set(gerarId(texto, INSTITUICAO), {
          id: gerarId(texto, INSTITUICAO),
          titulo: texto,
          instituicao: INSTITUICAO,
          dataLimite: dataMatch ? dataMatch[0] : "Consulte o edital",
          valorFomento: valorMatch ? valorMatch[0] : "Consulte o edital",
          link: href.startsWith("http") ? href : `https://www.finep.gov.br${href}`,
          descobertoEm: new Date().toISOString(),
        });
      });

      if (editaisMap.size > 0) break;
    } catch (erro) {
      console.warn(`[finep] Erro em ${url}: ${erro}`);
    }
  }

  return { instituicao: INSTITUICAO, editais: Array.from(editaisMap.values()) };
}
