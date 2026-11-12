import { expect, type Page } from '@playwright/test';
import {
  buildFornecedorPessoaJuridica,
  type BuildFornecedorPessoaJuridicaOptions,
  type FornecedorPessoaJuridicaData,
} from '../factories/fornecedor.factory';
import { navegarParaAdicionarFornecedor } from '../helpers/navigation/fornecedor.navigation';
import { preencherDocumentoFornecedor, salvarFornecedorAdicionado } from './fornecedor-comum';

export interface FornecedorPessoaJuridicaCriado extends FornecedorPessoaJuridicaData {
  /** CNPJ como exibido pelo SGE (com máscara), usado para localizar a linha na grade. */
  cnpjFormatado: string;
  url: string;
}

/** Cria um Fornecedor Pessoa Jurídica pela interface e confirma que o formulário entrou em edição. */
export async function criarFornecedorPessoaJuridica(
  page: Page,
  options: BuildFornecedorPessoaJuridicaOptions,
  sequencia = 1,
): Promise<FornecedorPessoaJuridicaCriado> {
  const dados = buildFornecedorPessoaJuridica(options, sequencia);
  await navegarParaAdicionarFornecedor(page, 'Pessoa Jurídica');

  const formulario = page.locator('#main');
  await formulario.locator('#RazaoSocial').fill(dados.razaoSocial);
  await preencherDocumentoFornecedor(formulario.locator('#Cnpj'), dados.cnpj);
  await formulario.locator('#NomeFantasia').fill(dados.nomeFantasia);
  if (dados.inscricaoEstadual) await formulario.locator('#InscricaoEstadual').fill(dados.inscricaoEstadual);
  if (dados.caf) await formulario.locator('#FornecedorPessoaJuridicaCaf').fill(dados.caf);
  if (dados.site) await formulario.locator('#Site').fill(dados.site);

  await salvarFornecedorAdicionado(page, 'Pessoa Jurídica');

  await expect(formulario.locator('#RazaoSocial')).toHaveValue(dados.razaoSocial);
  await expect(formulario.locator('#NomeFantasia')).toHaveValue(dados.nomeFantasia);
  const cnpjFormatado = await formulario.locator('#Cnpj').inputValue();
  expect(cnpjFormatado.replace(/\D/g, '')).toBe(dados.cnpj.replace(/\D/g, ''));

  console.log(`[QAAUTO] Fornecedor Pessoa Jurídica salvo em edição: ${dados.razaoSocial} | CNPJ: ${cnpjFormatado}`);
  return { ...dados, cnpjFormatado, url: page.url() };
}
