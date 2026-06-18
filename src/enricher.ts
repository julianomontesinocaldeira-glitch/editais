// src/enricher.ts
// Acessa a página de cada edital para buscar o valor do fomento
import axios from "axios";
import * as cheerio from "cheerio";
import { Edital } from "./types";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9",
};

function extrairValor(texto: string): string | null {
  // Padrões: R$ 1,5 milhão / R$ 300 milhões / R$ 50.000,00
  const padroes = [
    /R\$\s*[\d.,]+\s*(mil(hões?)?|bi(lhões?)?|milhões?|bilhões?)/gi,
    /R\$\s*[\d.,]{4,}/g,
    /[\d.,]+\s*(mil(hões?)?|bilhões?|milhões?)\s*(de\s+)?reais/gi,
  ];
  for (const padrao of padroes) {
    const match = texto.match(padrao);
    if (match && match[0]) return match[0].trim();
  }
  return null;
}

export async function enriquecerEdital(edital: Edital): Promise<Edital> {
  if (edital.valorFomento !== "Consulte o edital") return edital;
  if (!edital.link || !edital.link.startsWith("http")) return edital;

  try {
    const { data } = await axios.get(edital.link, {
      timeout: 10000,
      headers: HEADERS,
    });
    const $ = cheerio.load(data);
    const textoCompleto = $("body").text();
    const valor = extrairValor(textoCompleto);
    if (valor) {
      return { ...edital, valorFomento: valor };
    }
  } catch {
    // silencioso — mantém "Consulte o edital"
  }
  return edital;
}

export async function enriquecerEditais(editais: Edital[]): Promise<Edital[]> {
  // Processa em lotes de 3 para não sobrecarregar
  const resultado: Edital[] = [];
  for (let i = 0; i < editais.length; i += 3) {
    const lote = editais.slice(i, i + 3);
    const enriquecidos = await Promise.all(lote.map(enriquecerEdital));
    resultado.push(...enriquecidos);
    if (i + 3 < editais.length) {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return resultado;
}
