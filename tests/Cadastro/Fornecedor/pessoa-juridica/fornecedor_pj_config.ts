import fs from 'node:fs';
import path from 'node:path';
import type { BuildFornecedorPessoaJuridicaOptions } from '../../../../src/factories/fornecedor.factory';

export type ArquivoDadosFornecedorPj = 'dados_fornecedor_pj.json' | 'dados_exclusao_fornecedor_pj.json';

export function lerDadosFornecedorPj(arquivo: ArquivoDadosFornecedorPj): BuildFornecedorPessoaJuridicaOptions {
  const caminho = path.resolve(__dirname, arquivo);
  const conteudo: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof conteudo !== 'object' || conteudo === null || Array.isArray(conteudo)) {
    throw new Error(`${arquivo} deve conter um objeto JSON.`);
  }
  return conteudo as BuildFornecedorPessoaJuridicaOptions;
}

export function baseUrlFornecedor(): string {
  return process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';
}
