// src/hash.ts
import crypto from "crypto";

export function gerarId(titulo: string, instituicao: string): string {
  return crypto
    .createHash("sha256")
    .update(`${instituicao}::${titulo}`)
    .digest("hex")
    .slice(0, 16);
}
