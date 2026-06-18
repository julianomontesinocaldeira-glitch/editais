// src/scrapers/embrapii.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital, ResultadoScraper } from "../types";
import { gerarId } from "../hash";

const INSTITUICAO = "Embrapii";

export async function scraperEmbrapii(): Promise<ResultadoScraper> {
  const editaisMap = new Map<string, Edital>();

  const urls = [
    "https://embrapii.org.br/categoria/chamadas/",
    "https://embrapii.org.br/chamadas/",
    "https://embrapii.org.br/oportunidades/",
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

      $("article, .post, .entry, .chamada").each((_, el) => {
        const tituloEl = $(el).find("h1 a, h2 a, h3 a, .entry-title a").first();
        const titulo = tituloEl.text().trim();
        const href = tituloEl.attr("href") ?? "";
        if (titulo.length < 5) return;

        const contexto = $(el).text().trim();
        const dataMatch = contexto.match(/(\d{2}\/\d{2}\/\d{4})/);
        const valorMatch = contexto.match(/R\$\s*[\d.,]+\s*(mil(hões?)?|bi(lhões?)?)?/i);

        editaisMap.set(gerarId(titulo, INSTITUICAO), {
          id: gerarId(titulo, INSTITUICAO),
          titulo,
          instituicao: INSTITUICAO,
          dataLimite: dataMatch ? dataMatch[0] : "Consulte o edital",
          valorFomento: valorMatch ? valorMatch[0] : "Consulte o edital",
          link: href.startsWith("http") ? href : `https://embrapii.org.br${href}`,
          descobertoEm: new Date().toISOString(),
        });
      });

      if (editaisMap.size > 0) break;
    } catch (erro) {
      console.warn(`[embrapii] Erro em ${url}: ${erro}`);
    }
  }

  return { instituicao: INSTITUICAO, editais: Array.from(editaisMap.values()) };
}
