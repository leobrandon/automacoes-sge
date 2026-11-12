import type { Locator, Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

async function aguardarCarregamentoCategoriaDaTurma(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

function botaoAdicionarCategoriaDaTurma(page: Page): Locator {
  return page.locator('#main button').filter({ hasText: /Adicionar/i }).first();
}

/** Navega pela interface visivel ate a consulta de Categoria da Turma. */
export async function navegarParaConsultaCategoriaDaTurma(page: Page): Promise<void> {
  const nav = page.locator('nav');
  const main = page.locator('#main');
  const busca = main.locator('#searchTerm');
  const tabela = main.locator('table');
  const adicionar = botaoAdicionarCategoriaDaTurma(page);

  await aguardarCarregamentoCategoriaDaTurma(page);

  if (await adicionar.isVisible().catch(() => false)) {
    await busca.waitFor({ state: 'visible', timeout: 20000 });
    await tabela.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  // O nome acessível de Cadastro inclui ícones; a expressão evita confundir com "Cadastros Básicos".
  const destino = nav.getByRole('link', { name: 'Categoria da Turma', exact: true });
  const menuCadastro = nav.getByRole('link', { name: /Cadastro\s/ });

  if (!await destino.isVisible().catch(() => false)) {
    // Após o login, o menu lateral já está aberto. O botão hambúrguer o recolhe.
    await menuCadastro.waitFor({ state: 'visible', timeout: 15000 });
    console.log('🧭 Abrindo o menu Cadastro para localizar Categoria da Turma...');
    await menuCadastro.click();
  }

  await destino.waitFor({ state: 'visible', timeout: 15000 });
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '').endsWith('/categoriadaturma')
        && response.request().method() === 'GET',
      { timeout: 30000 },
    ),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A tela de Categoria da Turma retornou HTTP ${resposta.status()}.`);
  }

  await aguardarCarregamentoCategoriaDaTurma(page);
  await adicionar.waitFor({ state: 'visible', timeout: 20000 });
  await busca.waitFor({ state: 'visible', timeout: 20000 });
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarCategoriaDaTurma(page: Page): Promise<void> {
  await navegarParaConsultaCategoriaDaTurma(page);
  const adicionar = botaoAdicionarCategoriaDaTurma(page);
  await adicionar.waitFor({ state: 'visible', timeout: 15000 });
  console.log('🧭 Categoria da Turma carregada. Clicando em Adicionar...');
  await adicionar.click();
  const formulario = page.locator('#modalEditar');
  await formulario.waitFor({ state: 'visible', timeout: 15000 });
  await formulario.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
}

export function linhaCategoriaDaTurma(page: Page, descricao: string): Locator {
  const descricaoEscapada = descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page.locator('table tbody tr').filter({
    has: page.locator('td').filter({ hasText: new RegExp(`^${descricaoEscapada}$`) }),
  });
}

export async function pesquisarCategoriaDaTurma(page: Page, descricao: string): Promise<void> {
  await navegarParaConsultaCategoriaDaTurma(page);
  const busca = page.locator('#main #searchTerm');
  await busca.fill(descricao);
  const botaoBuscar = page.locator('#main #btn-submit');
  const [resultado] = await Promise.all([
    page.waitForResponse(
      (response) => /indexgrid/i.test(new URL(response.url()).pathname)
        && response.request().method() === 'GET',
      { timeout: 15000 },
    ),
    botaoBuscar.click(),
  ]);
  if (!resultado.ok()) throw new Error(`A consulta de Categoria da Turma retornou HTTP ${resultado.status()}.`);
  await waitForSgeLoaders(page);
}
