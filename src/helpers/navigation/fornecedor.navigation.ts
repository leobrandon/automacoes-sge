import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

export type TipoFornecedor = 'Pessoa Física' | 'Pessoa Jurídica';

const TITULO_CONSULTA_FORNECEDOR = /^\W*Fornecedor\W*$/i;

function main(page: Page): Locator {
  return page.locator('#main');
}

/** Navega pelo menu visível Cadastro > Fornecedor. */
export async function navegarParaConsultaFornecedor(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = getByRoleSge(conteudo, 'heading', { name: TITULO_CONSULTA_FORNECEDOR });
  const tabela = conteudo.locator('table:visible');
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await tabela.waitFor({ state: 'visible', timeout: 20000 });
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const cadastro = nav.getByRole('link', { name: /Cadastro/ }).first();
  // `has` é avaliado dentro de cada <li>, por isso usa locator de página (não encadeado em `nav`).
  const itemCadastro = nav.getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /^\W*Cadastro\W*$/ }) });
  // Também existe "Fornecedor" em Relatórios; o escopo do item Cadastro evita a ambiguidade.
  const fornecedor = itemCadastro.getByRole('link', { name: 'Fornecedor', exact: true });

  await expect(cadastro).toBeVisible({ timeout: 15000 });
  if (!await fornecedor.isVisible()) await cadastro.click();
  await expect(fornecedor).toBeVisible({ timeout: 15000 });
  await fornecedor.click();

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

/** Abre o formulário de adição pelo menu "+" da consulta, conforme o tipo de fornecedor. */
export async function navegarParaAdicionarFornecedor(page: Page, tipo: TipoFornecedor): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: new RegExp(`Adicionar Fornecedor ${tipo}`, 'i') });
  if (await formulario.isVisible()) return;

  await navegarParaConsultaFornecedor(page);
  // O botão "+" não tem nome acessível; é o toggle do grupo que contém o menu de tipos de fornecedor.
  await conteudo.locator('.btn-group')
    .filter({ has: page.locator('ul.tipoFornecedor') })
    .locator('button.dropdown-toggle')
    .click();
  const opcao = getByRoleSge(conteudo, 'link', { name: new RegExp(`Adicionar Fornecedor ${tipo}`, 'i') });
  await expect(opcao).toBeVisible();
  await opcao.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  await conteudo.locator('#btnSalvarFornecedor').waitFor({ state: 'visible', timeout: 15000 });
}

export async function pesquisarFornecedor(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaFornecedor(page);
  const conteudo = main(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');
  const botaoPesquisar = conteudo.locator('#searchForm button[type="submit"]:visible');

  await expect(pesquisa).toBeVisible();
  await pesquisa.fill(termo);
  await expect(botaoPesquisar).toBeVisible();

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR') === '/fornecedor/indexgrid';
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Fornecedores retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
}

/** Linha da grade identificada pelo nome e pelo CPF/CNPJ formatado (únicos por execução). */
export function linhaFornecedor(page: Page, nome: string, documentoFormatado: string): Locator {
  return main(page)
    .locator('table tbody tr')
    .filter({ has: page.getByText(nome, { exact: true }) })
    .filter({ hasText: documentoFormatado });
}

/** Pesquisa pelo nome e abre em edição o fornecedor correspondente pela grade. */
export async function abrirFornecedorNaConsulta(
  page: Page,
  nome: string,
  documentoFormatado: string,
  tipo: TipoFornecedor,
): Promise<void> {
  await pesquisarFornecedor(page, nome);
  const linha = linhaFornecedor(page, nome, documentoFormatado);
  await expect(linha).toHaveCount(1);
  await expect(linha).toContainText(tipo);
  await linha.getByText(nome, { exact: true }).click();
  await expect(getByRoleSge(main(page), 'heading', { name: new RegExp(`Editar Fornecedor ${tipo}`, 'i') }))
    .toBeVisible({ timeout: 20000 });
}

export async function voltarParaConsultaFornecedor(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(getByRoleSge(conteudo, 'heading', { name: TITULO_CONSULTA_FORNECEDOR }))
    .toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}
