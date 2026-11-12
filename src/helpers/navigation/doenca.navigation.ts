import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const CONSULTA_DOENCA = /Doenças/i;
const ROTA_DOENCA = '/doenca';

function main(page: Page): Locator {
  return page.locator('#main');
}

export async function aguardarCarregamentoDoenca(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Navega pelos menus visíveis Cadastro > Ficha Médica > Doenças. */
export async function navegarParaConsultaDoenca(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = conteudo.locator('h4').filter({ hasText: CONSULTA_DOENCA });
  const tabela = conteudo.locator('table');
  const busca = conteudo.locator('#searchTerm');

  await aguardarCarregamentoDoenca(page);
  if (await titulo.isVisible().catch(() => false)) {
    await tabela.waitFor({ state: 'visible', timeout: 20000 });
    await busca.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav');
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemCadastro = nav.getByRole('listitem')
    .filter({ has: getByRoleSge(page, 'link', { name: /^Ficha Médica/ }) })
    .first();
  const cadastro = itemCadastro.getByRole('link', { name: /Cadastro/ }).first();
  const fichaMedica = itemCadastro.getByRole('link', { name: /^Ficha Médica/ }).first();
  const destino = itemCadastro.getByRole('link', { name: 'Doenças', exact: true });

  if (!await destino.isVisible().catch(() => false)) {
    if (!await fichaMedica.isVisible().catch(() => false)) {
      await cadastro.waitFor({ state: 'visible', timeout: 15000 });
      await cadastro.click();
    }
    await fichaMedica.waitFor({ state: 'visible', timeout: 15000 });
    if (!await destino.isVisible().catch(() => false)) await fichaMedica.click();
  }

  await destino.waitFor({ state: 'visible', timeout: 15000 });
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA_DOENCA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A consulta de Doenças retornou HTTP ${resposta.status()}.`);

  await titulo.waitFor({ state: 'visible', timeout: 30000 });
  await aguardarCarregamentoDoenca(page);
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
  await busca.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarDoenca(page: Page): Promise<void> {
  await navegarParaConsultaDoenca(page);
  // O modal também tem um botão "Adicionar"; o id do botão da consulta é único.
  await main(page).locator('#btnAddDoenca').click();
  await page.locator('#modalDoenca #Descricao').waitFor({ state: 'visible', timeout: 15000 });
}

/** Linha da grade cuja célula de descrição é exatamente a informada. */
export function linhaDoenca(page: Page, descricao: string): Locator {
  return main(page).locator('table tbody tr:visible').filter({
    has: getByRoleSge(page, 'cell', { name: descricao, exact: true }),
  });
}

export async function pesquisarDoenca(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaDoenca(page);
  await main(page).locator('#searchTerm').fill(termo);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase().replace(/\/$/, '') === `${ROTA_DOENCA}/indexgrid`
        && url.searchParams.get('searchTerm') === termo
        && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    main(page).locator('#searchForm button[type="submit"]').click(),
  ]);
  if (!resposta.ok()) throw new Error(`A pesquisa de Doenças retornou HTTP ${resposta.status()}.`);

  await aguardarCarregamentoDoenca(page);
  await main(page).locator('table').waitFor({ state: 'visible', timeout: 15000 });
}

/** Aviso do SGE (swal2) com um único botão de confirmação. */
export async function confirmarAvisoDoenca(page: Page, texto: RegExp): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: texto });
  await expect(dialog).toBeVisible({ timeout: 20000 });
  await dialog.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

export async function confirmarExclusaoDoenca(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: /Tem certeza que deseja remover a doença\?/i });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await dialog.getByRole('button', { name: 'Sim', exact: true }).click();
  await confirmarAvisoDoenca(page, /Doença removida/i);
}
