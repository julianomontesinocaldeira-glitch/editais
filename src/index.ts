// src/index.ts
import cron from "node-cron";
import { scraperFapesp } from "./scrapers/fapesp";
import { scraperFinep } from "./scrapers/finep";
import { scraperCnpq } from "./scrapers/cnpq";
import { scraperEmbrapii } from "./scrapers/embrapii";
import { scraperSebrae } from "./scrapers/sebrae";
import { carregarEstado, salvarEstado } from "./persistence";
import { enviarResumo } from "./telegram";
import { enriquecerEditais } from "./enricher";
import { calcularMatch, EditalComMatch } from "./matcher";
import { Edital, ResultadoScraper } from "./types";

const IS_DRY_RUN = process.argv.includes("--dry-run");
const RUN_ONCE = process.argv.includes("--run-once") || process.env.RUN_ONCE === "true";

async function executar(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Iniciando varredura...`);

  const estado = carregarEstado();

  const scrapers = [
    scraperFapesp(),
    scraperFinep(),
    scraperCnpq(),
    scraperEmbrapii(),
    scraperSebrae(),
  ];

  const resultados: ResultadoScraper[] = await Promise.allSettled(scrapers).then(
    (settled) => settled.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      const nomes = ["FAPESP", "Finep", "CNPq", "Embrapii", "Sebrae"];
      return { instituicao: nomes[i], editais: [], erro: String(r.reason) };
    })
  );

  const todosEditais: Edital[] = resultados.flatMap(r => r.editais);
  const erros: string[] = resultados.filter(r => r.erro).map(r => `${r.instituicao}: ${r.erro}`);

  erros.forEach(e => console.warn(`[erro] ${e}`));
  console.log(`[scraping] Total encontrado: ${todosEditais.length}`);

  // Filtra apenas novos
  const editaisNovos = todosEditais.filter(e => !estado.editalVistos.includes(e.id));
  console.log(`[filtro] Novos: ${editaisNovos.length}`);

  if (IS_DRY_RUN) {
    console.log("[dry-run] Editais novos:");
    editaisNovos.forEach(e => console.log(`  [${e.instituicao}] ${e.titulo}`));
    return;
  }

  // Enriquece com valores das páginas
  console.log("[enricher] Buscando valores nas páginas...");
  const editaisEnriquecidos = await enriquecerEditais(editaisNovos);

  // Calcula match com perfil StartGi
  const editaisComMatch: EditalComMatch[] = editaisEnriquecidos
    .map(calcularMatch)
    .sort((a, b) => b.matchScore - a.matchScore); // ordena por relevância

  console.log(`[match] Relevantes para StartGi: ${editaisComMatch.filter(e => e.matchRelevante).length}`);

  // Envia para Telegram
  await enviarResumo(editaisComMatch, erros);

  // Salva estado
  const idsNovos = editaisNovos.map(e => e.id);
  salvarEstado({
    ultimaExecucao: new Date().toISOString(),
    editalVistos: [...estado.editalVistos, ...idsNovos].slice(-2000),
  });

  console.log(`[${new Date().toISOString()}] Concluído.`);
}

if (RUN_ONCE || IS_DRY_RUN) {
  executar().catch(e => { console.error("[fatal]", e); process.exit(1); });
} else {
  console.log("[cron] Agendado para 08:00 diariamente.");
  cron.schedule("0 8 * * *", () => executar().catch(e => console.error("[fatal]", e)));
  executar().catch(e => console.error("[fatal]", e));
}
