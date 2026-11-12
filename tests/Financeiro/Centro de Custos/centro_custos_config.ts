import fs from 'node:fs';
import path from 'node:path';

export interface ConfiguracaoCriacao<T> {
  quantidade: number;
  dados: T;
}

export interface ConfiguracaoExclusao {
  excluirTodasQAAUTO: boolean;
  descricao: string;
}

/** Lê `dados_<entidade>.json` da pasta da spec: textos vazios viram padrão da factory; `quantidade` vazia vale 1. */
export function lerConfiguracaoCriacao<T>(pasta: string, arquivo: string, campos: string[]): ConfiguracaoCriacao<T> {
  const x = objeto(pasta, arquivo);
  const dados: Record<string, string> = {};
  for (const k of campos) {
    const v = x[k];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string') throw new Error(`${arquivo}: "${k}" deve ser texto.`);
    if (v.trim()) dados[k] = v.trim();
  }
  const q = x.quantidade;
  const quantidade = q === undefined || q === null || q === '' ? 1 : Number(q);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) throw new Error(`${arquivo}: "quantidade" deve ser um inteiro positivo (vazio = 1).`);
  return {quantidade, dados: dados as T};
}

/** Exclusão individual exige descrição QAAUTO exata; a geral só com `excluirTodasQAAUTO: true`. */
export function lerConfiguracaoExclusao(pasta: string, arquivo: string): ConfiguracaoExclusao {
  const x = objeto(pasta, arquivo);
  if (typeof x.excluirTodasQAAUTO !== 'boolean') throw new Error(`Defina "excluirTodasQAAUTO" como true ou false em ${arquivo}.`);
  const descricao = typeof x.descricao === 'string' ? x.descricao.trim() : '';
  if (!x.excluirTodasQAAUTO && !/^QAAUTO\b/i.test(descricao)) throw new Error(`Informe em "descricao" (${arquivo}) o nome exato iniciado por QAAUTO.`);
  return {excluirTodasQAAUTO: x.excluirTodasQAAUTO, descricao};
}

function objeto(pasta: string, arquivo: string): Record<string, unknown> {
  const x: unknown = JSON.parse(fs.readFileSync(path.join(pasta, arquivo), 'utf8'));
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error(`${arquivo} deve conter um objeto JSON.`);
  return x as Record<string, unknown>;
}
