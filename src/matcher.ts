// src/matcher.ts
import { Edital } from "./types";

export interface EditalComMatch extends Edital {
  matchScore: number;       // 0-10
  matchJustificativa: string;
  matchRelevante: boolean;  // true se score >= 6
}

// Perfil da StartGi
const PERFIL_STARTGI = {
  areas: [
    "saas", "software", "tecnologia", "sistema", "plataforma", "digital",
    "inteligência artificial", "ia", "dados", "bi", "business intelligence",
    "inovação", "startup", "empreendedorismo", "mpe", "pequena empresa",
    "gestão", "automação", "compras", "licitação", "governo", "público",
    "crm", "erp", "nuvem", "cloud", "api"
  ],
  programasFavoravelveis: [
    "pipe", "subvenção", "subvencao", "mpe", "pequena empresa",
    "startup", "empreendedorismo", "centelha", "inovação empresarial",
    "tecnologia da informação", "transformação digital", "economia digital"
  ],
  programasDesfavoraveis: [
    "ict", "universidade", "instituto de pesquisa", "pesquisador",
    "graduação", "pós-graduação", "doutorado", "mestrado", "bolsa",
    "intercâmbio", "mobilidade", "biodiversidade", "agropecuária",
    "saúde", "medicina", "biologia", "química", "física", "geologia",
    "oceano", "clima", "antártica", "astronomia", "nuclear"
  ],
  semICT: true,      // não tem vínculo com universidade
  porte: "mpe",      // micro/pequena empresa
  faturamento: 3_000_000,
};

export function calcularMatch(edital: Edital): EditalComMatch {
  const texto = `${edital.titulo} ${edital.valorFomento}`.toLowerCase();
  let score = 5; // neutro
  const razoes: string[] = [];

  // Bônus por área alinhada
  const areasMatch = PERFIL_STARTGI.areas.filter(a => texto.includes(a));
  if (areasMatch.length > 0) {
    score += Math.min(areasMatch.length * 1.5, 4);
    razoes.push(`✅ Áreas alinhadas: ${areasMatch.slice(0, 3).join(", ")}`);
  }

  // Bônus por programas favoráveis
  const progFav = PERFIL_STARTGI.programasFavoravelveis.filter(p => texto.includes(p));
  if (progFav.length > 0) {
    score += Math.min(progFav.length * 1.5, 3);
    razoes.push(`✅ Programa adequado para MPE/startup: ${progFav[0]}`);
  }

  // Penalidade por exigir ICT
  const progDesfav = PERFIL_STARTGI.programasDesfavoraveis.filter(p => texto.includes(p));
  if (progDesfav.length > 0) {
    score -= Math.min(progDesfav.length * 2, 5);
    razoes.push(`❌ Pode exigir ICT ou área não alinhada: ${progDesfav[0]}`);
  }

  // Bônus especial por instituição
  if (edital.instituicao === "FAPESP" && texto.includes("pipe")) {
    score += 2;
    razoes.push("✅ PIPE FAPESP: ideal para empresas inovadoras sem ICT");
  }
  if (edital.instituicao === "Finep" && texto.includes("subvenção")) {
    score += 1.5;
    razoes.push("✅ Subvenção Finep: linha acessível para MPEs de tecnologia");
  }
  if (edital.instituicao === "Sebrae") {
    score += 1;
    razoes.push("✅ Sebrae: foco em pequenas empresas");
  }

  // Penalidade CNPq/Embrapii (geralmente exigem ICT)
  if (edital.instituicao === "CNPq") {
    score -= 1.5;
    razoes.push("⚠️ CNPq: maioria dos editais exige vínculo com ICT");
  }
  if (edital.instituicao === "Embrapii") {
    score -= 2;
    razoes.push("⚠️ Embrapii: modelo exige parceria com unidade Embrapii");
  }

  score = Math.max(0, Math.min(10, Math.round(score)));
  const relevante = score >= 6;

  const justificativa = razoes.length > 0
    ? razoes.join(" | ")
    : score >= 6
      ? "✅ Perfil geral compatível com StartGi"
      : "⚠️ Baixa aderência ao perfil da StartGi";

  return {
    ...edital,
    matchScore: score,
    matchJustificativa: justificativa,
    matchRelevante: relevante,
  };
}
