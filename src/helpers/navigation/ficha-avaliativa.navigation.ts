import { expect, type Locator, type Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';
import { getByRoleSge } from '../sge-locators.helper';

const CONSULTA = /Consulta de Ficha Avaliativa/i;
const ADICIONAR = /Adicionar Ficha Avaliativa/i;

function main(page: Page): Locator { return page.locator('#main'); }

export async function aguardarCarregamentoFichaAvaliativa(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Acessa Cadastro > Ensino > Ficha Avaliativa pelos itens visíveis do menu. */
export async function navegarParaConsultaFichaAvaliativa(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = conteudo.getByRole('heading', { name: CONSULTA, includeHidden: true });
  await aguardarCarregamentoFichaAvaliativa(page);
  if (!await titulo.isVisible().catch(() => false)) {
    const nav = page.locator('nav:visible').first();
    const cadastro = nav.locator('a:visible').filter({ hasText: /^\s*Cadastro(?:\s|$)/ }).first();
    const ensino = cadastro.locator('xpath=ancestor::li[1]').locator('a:visible').filter({ hasText: /^\s*Ensino(?:\s|$)/ }).first();
    const ficha = ensino.locator('xpath=ancestor::li[1]').locator('a:visible').filter({ hasText: /^\s*Ficha Avaliativa\s*$/ }).first();
    if (!await ensino.isVisible().catch(() => false)) await cadastro.click();
    if (!await ficha.isVisible().catch(() => false)) await ensino.click();
    await ficha.waitFor({ state: 'visible', timeout: 15000 });
    await ficha.click();
    await titulo.waitFor({ state: 'visible', timeout: 30000 });
    await aguardarCarregamentoFichaAvaliativa(page);
  }
  await conteudo.locator('#searchTerm:visible').waitFor({ state: 'visible', timeout: 20000 });
  await conteudo.locator('table:visible').waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarFichaAvaliativa(page: Page): Promise<void> {
  await navegarParaConsultaFichaAvaliativa(page);
  const adicionar = getByRoleSge(main(page), 'button', { name: /Adicionar\s*$/ });
  await adicionar.waitFor({ state: 'visible', timeout: 15000 });
  await adicionar.click();
  await main(page).getByRole('heading', { name: ADICIONAR, includeHidden: true }).waitFor({ state: 'visible', timeout: 20000 });
  await main(page).locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
}

export function linhaFichaAvaliativa(page: Page, descricao: string): Locator {
  const textoDescricao = page.locator('td:visible').getByText(descricao, { exact: true });
  return main(page).locator('table:visible tbody tr:visible').filter({
    has: textoDescricao,
  });
}

export async function pesquisarFichaAvaliativa(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaFichaAvaliativa(page);
  const busca = main(page).locator('#searchTerm:visible');
  await busca.fill(termo);
  const [resposta] = await Promise.all([
    page.waitForResponse(response => {
      const url = new URL(response.url());
      const postData = response.request().postData() ?? '';
      return url.pathname.toLocaleLowerCase('pt-BR').replace(/\/$/, '') === '/fichaavaliativa/indexgrid'
        && new URLSearchParams(postData).get('searchTerm') === termo
        && response.request().method() === 'POST';
    }, { timeout: 20000 }),
    main(page).locator('#searchForm button[type="submit"]:visible').click(),
  ]);
  if (!resposta.ok()) throw new Error(`A pesquisa de Ficha Avaliativa retornou HTTP ${resposta.status()}.`);
  await aguardarCarregamentoFichaAvaliativa(page);
  await expect(main(page).locator('table:visible')).toBeVisible();
}

export async function abrirEdicaoFichaAvaliativa(page: Page, descricao: string): Promise<void> {
  const linha = linhaFichaAvaliativa(page, descricao);
  await linha.waitFor({ state: 'visible', timeout: 15000 });
  if (await linha.count() !== 1) throw new Error(`Esperada uma linha para "${descricao}"; encontradas ${await linha.count()}.`);
  await linha.locator('td:visible').first().click();
  await main(page).getByRole('heading', { name: /Editar Ficha Avaliativa/i, includeHidden: true }).waitFor({ state: 'visible', timeout: 20000 });
  await expect(main(page).locator('#Descricao')).toHaveValue(descricao);
}
