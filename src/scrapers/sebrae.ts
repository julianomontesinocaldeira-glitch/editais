// src/scrapers/sebrae.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital, ResultadoScraper } from "../types";
import { gerarId } from "../hash";

const INSTITUICAO = "Sebrae";

export async function scraperSebrae(): Promise<ResultadoScraper> {
  const editaisMap = new Map<string, Edital>();

  const urls = [
    "https://sebrae.com.br/sites/PortalSebrae/ufs/ap/sebraeaz/editais-e-chamadas-publicas",
    "https://sebrae.com.br/sites/PortalSebrae/sebraeaz/editais",
    "https://www.sebrae.com.br/sites/PortalSebrae/editais",
  ];

  for (const url of urls) {
    try {
      const { data } = await axios.get(url, {
        timeout: 20000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9",
          "Referer": "https://sebrae.com.br/",
        },
      });
      const $ = cheerio.load(data);

      $("article, .edital-item, li, .item").each((_, el) => {
        const tituloEl = $(el).find("h2 a, h3 a, a").first();
        const titulo = tituloEl.text().trim();
        const href = tituloEl.attr("href") ?? "";
        if (titulo.length < 10) return;
        if (!/(edital|chamada|seleção|oportunidade|credenciamento|sebrae)/i.test(titulo)) return;

        const contexto = $(el).text().trim();
        const dataMatch = contexto.match(/(\d{2}\/\d{2}\/\d{4})/);

        editaisMap.set(gerarId(titulo, INSTITUICAO), {
          id: gerarId(titulo, INSTITUICAO),
          titulo,
          instituicao: INSTITUICAO,
          dataLimite: dataMatch ? dataMatch[0] : "Consulte o edital",
          valorFomento: "Consulte o edital",
          link: href.startsWith("http") ? href : `https://sebrae.com.br${href}`,
          descobertoEm: new Date().toISOString(),
        });
      });

      if (editaisMap.size > 0) break;
    } catch (erro) {
      console.warn(`[sebrae] Erro em ${url}: ${erro}`);
    }
  }

  return { instituicao: INSTITUICAO, editais: Array.from(editaisMap.values()) };
}
