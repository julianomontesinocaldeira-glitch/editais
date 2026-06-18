// src/scrapers/sebrae.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital, ResultadoScraper } from "../types";
import { gerarId } from "../hash";

const INSTITUICAO = "Sebrae";
const URLS = [
  "https://sebrae.com.br/sites/PortalSebrae/editais",
  "https://sebrae.com.br/sites/PortalSebrae/chamadaspublicas",
];

export async function scraperSebrae(): Promise<ResultadoScraper> {
  const editaisMap = new Map<string, Edital>();

  for (const url of URLS) {
    try {
      const { data } = await axios.get(url, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (compatible; RadarEditais/1.0)" } });
      const $ = cheerio.load(data);

      $("article, .edital-item, .chamada-item, li.item").each((_, el) => {
        const tituloEl = $(el).find("h2 a, h3 a, .titulo a, a[href*='edital']").first();
        const titulo = tituloEl.text().trim();
        const href = tituloEl.attr("href") ?? "";

        if (!titulo || titulo.length < 5) return;

        const dataLimite =
          $(el).find(".prazo, .deadline, time, [class*='date']").first().text().trim() ||
          "Consulte o edital";
        const valorFomento =
          $(el).find(".valor, .budget, [class*='valor']").first().text().trim() ||
          "Consulte o edital";

        const edital: Edital = {
          id: gerarId(titulo, INSTITUICAO),
          titulo,
          instituicao: INSTITUICAO,
          dataLimite,
          valorFomento,
          link: href.startsWith("http") ? href : `https://sebrae.com.br${href}`,
          descobertoEm: new Date().toISOString(),
        };

        editaisMap.set(edital.id, edital);
      });
    } catch (erro) {
      console.warn(`[sebrae] Erro ao raspar ${url}: ${erro}`);
    }
  }

  return { instituicao: INSTITUICAO, editais: Array.from(editaisMap.values()) };
}
