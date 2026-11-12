import fs from 'node:fs';
import path from 'node:path';
import type { BuildFornecedorPessoaFisicaOptions } from '../../../../src/factories/fornecedor.factory';

export type ArquivoDadosFornecedorPf = 'dados_fornecedor_pf.json' | 'dados_exclusao_fornecedor_pf.json';

export function lerDadosFornecedorPf(arquivo: ArquivoDadosFornecedorPf): BuildFornecedorPessoaFisicaOptions {
  const caminho = path.resolve(__dirname, arquivo);
  const conteudo: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof conteudo !== 'object' || conteudo === null || Array.isArray(conteudo)) {
    throw new Error(`${arquivo} deve conter um objeto JSON.`);
  }
  return conteudo as BuildFornecedorPessoaFisicaOptions;
}

export function baseUrlFornecedor(): string {
  return process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';
}
