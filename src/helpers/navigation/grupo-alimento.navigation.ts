import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const CONSULTA_GRUPO = /Grupos? de Alimento/i;
const ROTA_GRUPO = '/grupodealimento';

function main(page: Page): Locator {
  return page.locator('#main');
}

/** Modal do formulário (identificado pelo campo Nome, pois o id do modal não é estável). */
export function modalGrupoAlimento(page: Page): Locator {
  return page.locator('.modal:visible').filter({ has: page.locator('#Nome') });
}

export async function aguardarCarregamentoGrupoAlimento(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Navega pelos menus visíveis Alimentação Escolar > Cadastros Básicos > Grupo de Alimento. */
export async function navegarParaConsultaGrupoAlimento(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = conteudo.locator('h4').filter({ hasText: CONSULTA_GRUPO });
  const tabela = conteudo.locator('table');
  const busca = conteudo.locator('#searchTerm');

  await aguardarCarregamentoGrupoAlimento(page);
  if (await titulo.isVisible().catch(() => false)) {
    await tabela.waitFor({ state: 'visible', timeout: 20000 });
    await busca.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav');
  // O menu lateral fica aria-hidden no SGE: localiza pelos links visíveis, não por role.
  const destino = nav.locator('a').filter({ hasText: /^\s*Grupo de Alimento\s*$/ });
  if (!await destino.isVisible().catch(() => false)) {
    const pai = nav.locator('a').filter({ hasText: /^\s*Alimentação Escolar\s*$/ });
    const basicos = nav.locator('a').filter({ hasText: /^\s*Cadastros Básicos\s*$/ });
    if (!await pai.isVisible().catch(() => false)) await page.getByTitle('Mostar/Esconder Menu').click();
    if (!await basicos.isVisible().catch(() => false)) await pai.click();
    await basicos.waitFor({ state: 'visible', timeout: 15000 });
    if (!await destino.isVisible().catch(() => false)) await basicos.click();
  }

  await destino.waitFor({ state: 'visible', timeout: 15000 });
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA_GRUPO && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A consulta de Grupo de Alimento retornou HTTP ${resposta.status()}.`);

  await titulo.waitFor({ state: 'visible', timeout: 30000 });
  await aguardarCarregamentoGrupoAlimento(page);
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
  await busca.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarGrupoAlimento(page: Page): Promise<void> {
  await navegarParaConsultaGrupoAlimento(page);
  await main(page).getByTitle('Adicionar Grupo de Alimento').click();
  await modalGrupoAlimento(page).locator('#Nome').waitFor({ state: 'visible', timeout: 15000 });
}

/** Linha da grade cuja célula de nome é exatamente a informada. */
export function linhaGrupoAlimento(page: Page, nome: string): Locator {
  return main(page).locator('table tbody tr:visible').filter({
    has: getByRoleSge(page, 'cell', { name: nome, exact: true }),
  });
}

export async function pesquisarGrupoAlimento(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaGrupoAlimento(page);
  await main(page).locator('#searchTerm').fill(termo);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase().replace(/\/$/, '') === `${ROTA_GRUPO}/indexgrid`
        && url.searchParams.get('searchTerm') === termo
        && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    main(page).locator('#btnSubmitSearch').click(),
  ]);
  if (!resposta.ok()) throw new Error(`A pesquisa de Grupo de Alimento retornou HTTP ${resposta.status()}.`);

  await aguardarCarregamentoGrupoAlimento(page);
  await main(page).locator('table').waitFor({ state: 'visible', timeout: 15000 });
}

/** Aviso do SGE (swal2) com um único botão de confirmação. */
export async function confirmarAvisoGrupoAlimento(page: Page, texto: RegExp): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: texto });
  await expect(dialog).toBeVisible({ timeout: 20000 });
  await dialog.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

export async function confirmarExclusaoGrupoAlimento(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: /Deseja realmente excluir esse Grupo de Alimento\?/i });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await dialog.getByRole('button', { name: 'Sim', exact: true }).click();
  await confirmarAvisoGrupoAlimento(page, /O Grupo de Alimento foi excluído/i);
}
