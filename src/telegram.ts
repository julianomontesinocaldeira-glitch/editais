// src/telegram.ts
import axios from "axios";
import { Edital } from "./types";
import { EditalComMatch } from "./matcher";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? "";

const EMOJI_INST: Record<string, string> = {
  FAPESP: "🔬",
  Finep: "🚀",
  CNPq: "🎓",
  Embrapii: "🏭",
  Sebrae: "🤝",
};

const EMOJI_SCORE: Record<number, string> = {
  10: "🟢🟢🟢", 9: "🟢🟢🟢", 8: "🟢🟢⚪",
  7: "🟢⚪⚪", 6: "🟡⚪⚪", 5: "🔴⚪⚪",
};

function getEmojiScore(score: number): string {
  return EMOJI_SCORE[score] ?? (score >= 6 ? "🟢⚪⚪" : "🔴⚪⚪");
}

function escapeMd(texto: string): string {
  return texto.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, "\\$&");
}

function formatarEdital(edital: EditalComMatch): string {
  const emoji = EMOJI_INST[edital.instituicao] ?? "📋";
  const scoreBar = getEmojiScore(edital.matchScore);

  return [
    `${emoji} *${escapeMd(edital.titulo)}*`,
    `🏛 *Instituição:* ${escapeMd(edital.instituicao)}`,
    `📅 *Prazo:* ${escapeMd(edital.dataLimite)}`,
    `💰 *Valor:* ${escapeMd(edital.valorFomento)}`,
    `🎯 *Match StartGi:* ${scoreBar} ${edital.matchScore}/10`,
    `💡 _${escapeMd(edital.matchJustificativa)}_`,
    `🔗 [Acessar edital](${edital.link})`,
  ].join("\n");
}

async function enviarMensagem(texto: string): Promise<void> {
  if (!TOKEN || !CHAT_ID) {
    console.log("[telegram] Sem credenciais — exibindo mensagem:");
    console.log(texto);
    return;
  }
  await axios.post(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    chat_id: CHAT_ID,
    text: texto,
    parse_mode: "MarkdownV2",
    disable_web_page_preview: false,
  });
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function enviarResumo(
  novosEditais: EditalComMatch[],
  erros: string[]
): Promise<void> {
  const data = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  if (novosEditais.length === 0 && erros.length === 0) {
    await enviarMensagem(`✅ *Radar de Editais — ${escapeMd(data)}*\n\nNenhum edital novo encontrado hoje\\.`);
    return;
  }

  // Separa relevantes dos demais
  const relevantes = novosEditais.filter(e => e.matchRelevante);
  const demais = novosEditais.filter(e => !e.matchRelevante);

  // Cabeçalho
  const cabecalho =
    `📡 *Radar de Editais — ${escapeMd(data)}*\n` +
    `_${novosEditais.length} edital${novosEditais.length !== 1 ? "is" : ""} novo${novosEditais.length !== 1 ? "s" : ""} ` +
    `\\| ${relevantes.length} relevante${relevantes.length !== 1 ? "s" : ""} para a StartGi_`;
  await enviarMensagem(cabecalho);
  await sleep(300);

  // Envia relevantes primeiro
  if (relevantes.length > 0) {
    await enviarMensagem(`🎯 *RELEVANTES PARA A STARTGI \\(${relevantes.length}\\)*`);
    await sleep(200);
    for (const edital of relevantes) {
      try {
        await enviarMensagem(formatarEdital(edital));
        await sleep(400);
      } catch (e) {
        console.error(`[telegram] Erro ao enviar ${edital.id}:`, e);
      }
    }
  }

  // Envia demais com separador
  if (demais.length > 0) {
    await enviarMensagem(`📋 *OUTROS EDITAIS \\(${demais.length}\\)*`);
    await sleep(200);
    for (const edital of demais) {
      try {
        await enviarMensagem(formatarEdital(edital));
        await sleep(400);
      } catch (e) {
        console.error(`[telegram] Erro ao enviar ${edital.id}:`, e);
      }
    }
  }

  // Erros
  if (erros.length > 0) {
    const rodape = `⚠️ *Avisos:*\n` + erros.map(e => `• ${escapeMd(e)}`).join("\n");
    await enviarMensagem(rodape);
  }
}
