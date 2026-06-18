// src/scrapers/finep.ts
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital, ResultadoScraper } from "../types";
import { gerarId } from "../hash";

const INSTITUICAO = "Finep";
const URL = "https://www.finep.gov.br/chamadas-publicas";

export async function scraperFinep(): Promise<ResultadoScraper> {
  try {
    const { data } = await axios.get(URL, { timeout: 15000, headers: { "User-Agent": "Mozilla/5.0 (compatible; RadarEditais/1.0)" } });
    const $ = cheerio.load(data);
    const editais: Edital[] = [];

    // Estrutura do site Finep: tabela ou lista de chamadas
    $("table tbody tr, .chamada-item, .views-row").each((_, el) => {
      const tituloEl = $(el).find("td a, .field-content a, h3 a").first();
      const titulo = tituloEl.text().trim();
      const href = tituloEl.attr("href") ?? "";

      if (!titulo || titulo.length < 5) return;

      const dataLimite =
        $(el).find("td:nth-child(3), .prazo, [class*='date']").first().text().trim() ||
        "Consulte o edital";

      const valorFomento =
        $(el).find("td:nth-child(4), .valor, [class*='valor']").first().text().trim() ||
        "Consulte o edital";

      editais.push({
        id: gerarId(titulo, INSTITUICAO),
        titulo,
        instituicao: INSTITUICAO,
        dataLimite,
        valorFomento,
        link: href.startsWith("http") ? href : `https://www.finep.gov.br${href}`,
        descobertoEm: new Date().toISOString(),
      });
    });

    return { instituicao: INSTITUICAO, editais };
  } catch (erro: unknown) {
    return { instituicao: INSTITUICAO, editais: [], erro: String(erro) };
  }
}
