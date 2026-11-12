import fs from 'node:fs';
import path from 'node:path';
import type { BuildEscalaOptions } from '../../../../src/factories/escala.factory';

export interface DadosLimpezaEscala {
  excluirTodasQAAUTO?: boolean;
  termoBusca?: string;
}

function lerJson(arquivo: string): object {
  const caminho = path.resolve(__dirname, arquivo);
  const conteudo: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof conteudo !== 'object' || conteudo === null || Array.isArray(conteudo)) {
    throw new Error(`${arquivo} deve conter um objeto JSON.`);
  }
  return conteudo;
}

export function lerDadosEscala(arquivo: 'dados_escala.json' | 'dados_exclusao_escala.json'): BuildEscalaOptions {
  return lerJson(arquivo) as BuildEscalaOptions;
}

export function lerDadosLimpezaEscala(): DadosLimpezaEscala {
  return lerJson('dados_limpeza_escala.json') as DadosLimpezaEscala;
}
