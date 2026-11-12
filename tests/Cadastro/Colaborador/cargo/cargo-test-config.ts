import fs from 'node:fs';
import path from 'node:path';
import type { BuildCargoOptions } from '../../../../src/factories/cargo.factory';

export type ArquivoDadosCargo = 'dados_cargo.json' | 'dados_exclusao_cargo.json';

export function lerDadosCargo(arquivo: ArquivoDadosCargo): BuildCargoOptions {
  const caminho = path.resolve(__dirname, arquivo);
  const conteudo: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof conteudo !== 'object' || conteudo === null || Array.isArray(conteudo)) {
    throw new Error(`${arquivo} deve conter um objeto JSON.`);
  }
  return conteudo as BuildCargoOptions;
}

export function validarUrlSandbox(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    throw new Error('Informe uma URL válida para o sandbox.');
  }
  return baseUrl;
}
