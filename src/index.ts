// src/index.ts
import cron from "node-cron";
import { scraperFapesp } from "./scrapers/fapesp";
import { scraperFinep } from "./scrapers/finep";
import { scraperCnpq } from "./scrapers/cnpq";
import { scraperEmbrapii } from "./scrapers/embrapii";
import { scraperSebrae } from "./scrapers/sebrae";
import { carregarEstado, salvarEstado } from "./persistence";
import { enviarResumo } from "./telegram";
import { Edital, ResultadoScraper } from "./types";

const IS_DRY_RUN = process.argv.includes("--dry-run");
const RUN_ONCE = process.argv.includes("--run-once") || process.env.RUN_ONCE === "true";

async function executar(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Iniciando varredura de editais...`);

  const estado = carregarEstado();
  console.log(`[estado] Última execução: ${estado.ultimaExecucao}`);
  console.log(`[estado] Editais já vistos: ${estado.editalVistos.length}`);

  // Executa todos os scrapers em paralelo
  const scrapers = [
    scraperFapesp(),
    scraperFinep(),
    scraperCnpq(),
    scraperEmbrapii(),
    scraperSebrae(),
  ];

  const resultados: ResultadoScraper[] = await Promise.allSettled(scrapers).then(
    (settled) =>
      settled.map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        const nomes = ["FAPESP", "Finep", "CNPq", "Embrapii", "Sebrae"];
        return { instituicao: nomes[i], editais: [], erro: String(r.reason) };
      })
  );

  // Coleta todos os editais
  const todosEditais: Edital[] = resultados.flatMap((r) => r.editais);
  const erros: string[] = resultados
    .filter((r) => r.erro)
    .map((r) => `${r.instituicao}: ${r.erro}`);

  // Log de erros
  erros.forEach((e) => console.warn(`[erro] ${e}`));
  console.log(`[scraping] Total de editais encontrados: ${todosEditais.length}`);

  // Filtra apenas editais novos (não vistos antes)
  const novosEditais = todosEditais.filter(
    (e) => !estado.editalVistos.includes(e.id)
  );

  console.log(`[filtro] Editais novos: ${novosEditais.length}`);

  if (IS_DRY_RUN) {
    console.log("[dry-run] Nenhum envio ou persistência. Editais novos:");
    novosEditais.forEach((e) =>
      console.log(`  - [${e.instituicao}] ${e.titulo} | ${e.dataLimite} | ${e.link}`)
    );
    return;
  }

  // Envia para o Telegram
  await enviarResumo(novosEditais, erros);

  // Atualiza o estado persistido
  const idsNovos = novosEditais.map((e) => e.id);
  const novoEstado = {
    ultimaExecucao: new Date().toISOString(),
    // Mantém os últimos 2000 IDs para não crescer indefinidamente
    editalVistos: [...estado.editalVistos, ...idsNovos].slice(-2000),
  };

  salvarEstado(novoEstado);
  console.log(`[estado] Salvo. Total de IDs rastreados: ${novoEstado.editalVistos.length}`);
  console.log(`[${new Date().toISOString()}] Varredura concluída.`);
}

// Modo de execução
if (RUN_ONCE || IS_DRY_RUN) {
  // Execução única (GitHub Actions ou testes)
  executar().catch((e) => {
    console.error("[fatal]", e);
    process.exit(1);
  });
} else {
  // Modo daemon com cron — todos os dias às 08:00 (horário do servidor)
  console.log("[cron] Agendado para 08:00 diariamente.");
  cron.schedule("0 8 * * *", () => {
    executar().catch((e) => console.error("[fatal]", e));
  });

  // Executa imediatamente na primeira inicialização
  executar().catch((e) => console.error("[fatal]", e));
}
