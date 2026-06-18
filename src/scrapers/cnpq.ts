// src/scrapers/cnpq.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital, ResultadoScraper } from "../types";
import { gerarId } from "../hash";

const INSTITUICAO = "CNPq";
const URL = "https://www.gov.br/cnpq/pt-br/acesso-a-informacao/acoes-e-programas/chamadas-publicas";

export async function scraperCnpq(): Promise<ResultadoScraper> {
  try {
    const { data } = await axios.get(URL, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (compatible; RadarEditais/1.0)" } });
    const $ = cheerio.load(data);
    const editais: Edital[] = [];

    // Portal gov.br — padrão de lista de conteúdo
    $("article, .tileItem, li.contenttype-chamada").each((_, el) => {
      const tituloEl = $(el).find("h2 a, h3 a, .tileHeadline a, .summary-title a").first();
      const titulo = tituloEl.text().trim();
      const href = tituloEl.attr("href") ?? "";

      if (!titulo || titulo.length < 5) return;

      const dataLimite =
        $(el).find(".end, .prazo, [class*='date'], time").first().text().trim() ||
        "Consulte o edital";

      editais.push({
        id: gerarId(titulo, INSTITUICAO),
        titulo,
        instituicao: INSTITUICAO,
        dataLimite,
        valorFomento: "Consulte o edital",
        link: href.startsWith("http") ? href : `https://www.gov.br${href}`,
        descobertoEm: new Date().toISOString(),
      });
    });

    // Fallback: links com palavra "chamada" ou "edital"
    if (editais.length === 0) {
      $("a").each((_, el) => {
        const titulo = $(el).text().trim();
        const href = $(el).attr("href") ?? "";
        if (!titulo || titulo.length < 15) return;
        if (!/(chamada|edital|seleção|oportunidade)/i.test(titulo)) return;

        editais.push({
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

    return { instituicao: INSTITUICAO, editais };
  } catch (erro: unknown) {
    return { instituicao: INSTITUICAO, editais: [], erro: String(erro) };
  }
}
