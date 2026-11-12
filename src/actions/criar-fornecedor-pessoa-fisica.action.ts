import { expect, type Page } from '@playwright/test';
import {
  buildFornecedorPessoaFisica,
  type BuildFornecedorPessoaFisicaOptions,
  type FornecedorPessoaFisicaData,
} from '../factories/fornecedor.factory';
import { navegarParaAdicionarFornecedor } from '../helpers/navigation/fornecedor.navigation';
import { preencherDocumentoFornecedor, salvarFornecedorAdicionado } from './fornecedor-comum';

export interface FornecedorPessoaFisicaCriado extends FornecedorPessoaFisicaData {
  /** CPF como exibido pelo SGE (com máscara), usado para localizar a linha na grade. */
  cpfFormatado: string;
  url: string;
}

/** Cria um Fornecedor Pessoa Física pela interface e confirma que o formulário entrou em edição. */
export async function criarFornecedorPessoaFisica(
  page: Page,
  options: BuildFornecedorPessoaFisicaOptions,
  sequencia = 1,
): Promise<FornecedorPessoaFisicaCriado> {
  const dados = buildFornecedorPessoaFisica(options, sequencia);
  await navegarParaAdicionarFornecedor(page, 'Pessoa Física');

  const formulario = page.locator('#main');
  await formulario.locator('#Nome').fill(dados.nome);
  await preencherDocumentoFornecedor(formulario.locator('#Cpf'), dados.cpf);
  if (dados.caf) await formulario.locator('#FornecedorPessoaFisicaCaf').fill(dados.caf);
  if (dados.site) await formulario.locator('#Site').fill(dados.site);

  await salvarFornecedorAdicionado(page, 'Pessoa Física');

  await expect(formulario.locator('#Nome')).toHaveValue(dados.nome);
  const cpfFormatado = await formulario.locator('#Cpf').inputValue();
  expect(cpfFormatado.replace(/\D/g, '')).toBe(dados.cpf.replace(/\D/g, ''));

  console.log(`[QAAUTO] Fornecedor Pessoa Física salvo em edição: ${dados.nome} | CPF: ${cpfFormatado}`);
  return { ...dados, cpfFormatado, url: page.url() };
}
