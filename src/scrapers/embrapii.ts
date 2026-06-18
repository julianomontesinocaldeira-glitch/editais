// src/scrapers/embrapii.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital, ResultadoScraper } from "../types";
import { gerarId } from "../hash";

const INSTITUICAO = "Embrapii";
const URL = "https://embrapii.org.br/chamadas/";

export async function scraperEmbrapii(): Promise<ResultadoScraper> {
  try {
    const { data } = await axios.get(URL, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (compatible; RadarEditais/1.0)" } });
    const $ = cheerio.load(data);
    const editais: Edital[] = [];

    // Site Embrapii — cards WordPress
    $("article, .chamada-card, .post").each((_, el) => {
      const tituloEl = $(el).find("h2 a, h3 a, .entry-title a").first();
      const titulo = tituloEl.text().trim();
      const href = tituloEl.attr("href") ?? "";

      if (!titulo || titulo.length < 5) return;

      const dataLimite =
        $(el).find(".deadline, .prazo, time, .entry-date").first().text().trim() ||
        "Consulte o edital";
      const valorFomento =
        $(el).find(".valor, .budget, [class*='valor']").first().text().trim() ||
        "Consulte o edital";

      editais.push({
        id: gerarId(titulo, INSTITUICAO),
        titulo,
        instituicao: INSTITUICAO,
        dataLimite,
        valorFomento,
        link: href.startsWith("http") ? href : `https://embrapii.org.br${href}`,
        descobertoEm: new Date().toISOString(),
      });
    });

    return { instituicao: INSTITUICAO, editais };
  } catch (erro: unknown) {
    return { instituicao: INSTITUICAO, editais: [], erro: String(erro) };
  }
}
