// src/persistence.ts
import fs from "fs";
import path from "path";
import { EstadoPersistido } from "./types";

const ESTADO_PATH = path.resolve(__dirname, "../estado.json");

const ESTADO_INICIAL: EstadoPersistido = {
  ultimaExecucao: new Date(0).toISOString(),
  editalVistos: [],
};

export function carregarEstado(): EstadoPersistido {
  if (!fs.existsSync(ESTADO_PATH)) {
    return { ...ESTADO_INICIAL };
  }
  try {
    const conteudo = fs.readFileSync(ESTADO_PATH, "utf-8");
    return JSON.parse(conteudo) as EstadoPersistido;
  } catch {
    console.warn("[persistence] estado.json corrompido — usando estado inicial.");
    return { ...ESTADO_INICIAL };
  }
}

export function salvarEstado(estado: EstadoPersistido): void {
  fs.writeFileSync(ESTADO_PATH, JSON.stringify(estado, null, 2), "utf-8");
}
