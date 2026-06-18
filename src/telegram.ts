// src/telegram.ts
import axios from "axios";
import { Edital } from "./types";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";
const BASE_URL = `https://api.telegram.org/bot${TOKEN}`;

const EMOJI_INST: Record<string, string> = {
  FAPESP: "🔬",
  Finep: "🚀",
  CNPq: "🎓",
  Embrapii: "🏭",
  Sebrae: "🤝",
};

function formatarEdital(edital: Edital): string {
  const emoji = EMOJI_INST[edital.instituicao] ?? "📋";
  const linhas = [
    `${emoji} *${escapeMd(edital.titulo)}*`,
    `🏛 *Instituição:* ${escapeMd(edital.instituicao)}`,
    `📅 *Prazo:* ${escapeMd(edital.dataLimite)}`,
    `💰 *Valor:* ${escapeMd(edital.valorFomento)}`,
    `🔗 [Acessar edital](${edital.link})`,
  ];
  return linhas.join("\n");
}

function escapeMd(texto: string): string {
  // Escapa caracteres especiais do MarkdownV2
  return texto.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

async function enviarMensagem(texto: string): Promise<void> {
  if (!TOKEN || !CHAT_ID) {
    console.log("[telegram] TOKEN ou CHAT_ID não configurados — pulando envio.");
    console.log("--- MENSAGEM ---\n", texto, "\n---");
    return;
  }

  await axios.post(`${BASE_URL}/sendMessage`, {
    chat_id: CHAT_ID,
    text: texto,
    parse_mode: "MarkdownV2",
    disable_web_page_preview: false,
  });
}

export async function enviarResumo(novosEditais: Edital[], erros: string[]): Promise<void> {
  if (novosEditais.length === 0 && erros.length === 0) {
    const msg = `✅ *Radar de Editais — ${new Date().toLocaleDateString("pt-BR")}*\n\nNenhum edital novo encontrado hoje\\.`;
    await enviarMensagem(msg);
    return;
  }

  // Cabeçalho
  const data = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const cabecalho =
    `📡 *Radar de Editais — ${escapeMd(data)}*\n` +
    `_${novosEditais.length} novo${novosEditais.length !== 1 ? "s" : ""} edital${novosEditais.length !== 1 ? "is" : ""} encontrado${novosEditais.length !== 1 ? "s" : ""}_`;

  await enviarMensagem(cabecalho);

  // Envia cada edital separadamente (evita limite de 4096 chars)
  for (const edital of novosEditais) {
    try {
      await enviarMensagem(formatarEdital(edital));
      await sleep(300); // evita rate limit do Telegram
    } catch (e) {
      console.error(`[telegram] Erro ao enviar edital ${edital.id}:`, e);
    }
  }

  // Rodapé com erros, se houver
  if (erros.length > 0) {
    const rodape =
      `⚠️ *Avisos de scraping:*\n` +
      erros.map((e) => `• ${escapeMd(e)}`).join("\n");
    await enviarMensagem(rodape);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
