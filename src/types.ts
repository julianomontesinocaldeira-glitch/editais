// src/types.ts

export interface Edital {
  id: string;           // hash único gerado a partir do título + instituição
  titulo: string;
  instituicao: string;
  dataLimite: string;   // texto como encontrado na página
  valorFomento: string; // texto como encontrado na página
  link: string;
  descobertoEm: string; // ISO timestamp
}

export interface EstadoPersistido {
  ultimaExecucao: string;       // ISO timestamp
  editalVistos: string[];       // lista de IDs já enviados
}

export interface ResultadoScraper {
  instituicao: string;
  editais: Edital[];
  erro?: string;
}
