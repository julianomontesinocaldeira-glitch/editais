// src/scrapers/fapesp.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital, ResultadoScraper } from "../types";
import { gerarId } from "../hash";

const INSTITUICAO = "FAPESP";

export async function scraperFapesp(): Promise<ResultadoScraper> {
  const editaisMap = new Map<string, Edital>();

  const urls = [
    "https://fapesp.br/chamadas/",
    "https://fapesp.br/chamadas-html",
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

      // Tenta múltiplos seletores
      const seletores = [
        "table tr", ".chamada", "li", "p", "div"
      ];

      // Busca por links que parecem editais
      $("a").each((_, el) => {
        const texto = $(el).text().trim();
        const href = $(el).attr("href") ?? "";
        if (texto.length < 15) return;
        if (!/(chamada|edital|proposta|pesquisa|pipe|pite|auxílio|bolsa|programa)/i.test(texto)) return;

        const contexto = $(el).closest("tr, li, div, p").text().trim();
        const dataMatch = contexto.match(/(\d{2}\/\d{2}\/\d{4}|\d{2}\/\d{4})/);

        editaisMap.set(gerarId(texto, INSTITUICAO), {
          id: gerarId(texto, INSTITUICAO),
          titulo: texto,
          instituicao: INSTITUICAO,
          dataLimite: dataMatch ? dataMatch[0] : "Consulte o edital",
          valorFomento: "Consulte o edital",
          link: href.startsWith("http") ? href : `https://fapesp.br${href}`,
          descobertoEm: new Date().toISOString(),
        });
      });

      if (editaisMap.size > 0) break;
    } catch (erro) {
      console.warn(`[fapesp] Erro em ${url}: ${erro}`);
    }
  }

  return { instituicao: INSTITUICAO, editais: Array.from(editaisMap.values()) };
}
