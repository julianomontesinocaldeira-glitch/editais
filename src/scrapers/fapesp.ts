// src/scrapers/fapesp.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital, ResultadoScraper } from "../types";
import { gerarId } from "../hash";

const INSTITUICAO = "FAPESP";
const URL = "https://fapesp.br/oportunidades";

export async function scraperFapesp(): Promise<ResultadoScraper> {
  try {
    const { data } = await axios.get(URL, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (compatible; RadarEditais/1.0)" } });
    const $ = cheerio.load(data);
    const editais: Edital[] = [];

    // A FAPESP lista oportunidades em cards ou tabela — adaptamos para o padrão atual
    $("table.oportunidades tr, .oportunidade-item, article.opportunity").each((_, el) => {
      const titulo = $(el).find("td:first-child a, .titulo a, h3 a").first().text().trim();
      const link = $(el).find("td:first-child a, .titulo a, h3 a").first().attr("href") ?? "";
      const dataLimite = $(el).find("td:nth-child(2), .prazo, .deadline").first().text().trim();
      const valorFomento = $(el).find("td:nth-child(3), .valor, .value").first().text().trim();

      if (!titulo) return;

      editais.push({
        id: gerarId(titulo, INSTITUICAO),
        titulo,
        instituicao: INSTITUICAO,
        dataLimite: dataLimite || "Consulte o edital",
        valorFomento: valorFomento || "Consulte o edital",
        link: link.startsWith("http") ? link : `https://fapesp.br${link}`,
        descobertoEm: new Date().toISOString(),
      });
    });

    // Fallback: busca links de editais genéricos na página
    if (editais.length === 0) {
      $("a[href*='chamada'], a[href*='edital'], a[href*='opportunity']").each((_, el) => {
        const titulo = $(el).text().trim();
        const link = $(el).attr("href") ?? "";
        if (!titulo || titulo.length < 10) return;

        editais.push({
          id: gerarId(titulo, INSTITUICAO),
          titulo,
          instituicao: INSTITUICAO,
          dataLimite: "Consulte o edital",
          valorFomento: "Consulte o edital",
          link: link.startsWith("http") ? link : `https://fapesp.br${link}`,
          descobertoEm: new Date().toISOString(),
        });
      });
    }

    return { instituicao: INSTITUICAO, editais };
  } catch (erro: unknown) {
    return { instituicao: INSTITUICAO, editais: [], erro: String(erro) };
  }
}
