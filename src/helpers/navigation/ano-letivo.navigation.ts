import {expect, type Locator, type Page} from '@playwright/test';
import {getByRoleSge} from '../sge-locators.helper';
import {waitForSgeLoaders} from './common.navigation';

const rota = '/anoletivo';

export const linhaAnoLetivo = (page: Page, ano: string): Locator =>
  page.locator('#main table tbody tr:visible').filter({has: getByRoleSge(page, 'cell', {name: ano, exact: true})});

export const tituloConsultaAnoLetivo = (page: Page): Locator =>
  page.locator('#main h4').filter({hasText: 'Consulta de Ano Letivo'});

export async function consultaAnoLetivo(page: Page): Promise<void> {
  const titulo = tituloConsultaAnoLetivo(page);
  if (await titulo.isVisible()) return;
  const n = page.locator('nav');
  const ensino = n.locator('a:visible').filter({hasText: /^\s*Ensino\s*$/});
  const destino = n.locator('a[onclick*="\'/anoletivo\'"]').filter({hasText: /^\s*Ano Letivo\s*$/});
  if (!await ensino.isVisible()) await page.getByTitle('Mostar/Esconder Menu').click();
  if (!await destino.isVisible()) await ensino.click();
  const [r] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase() === rota && x.request().method() === 'GET', {timeout: 30000}),
    destino.click(),
  ]);
  if (!r.ok()) throw new Error(`Consulta de Ano Letivo: HTTP ${r.status()}.`);
  await expect(titulo).toBeVisible();
  await waitForSgeLoaders(page);
}

export async function voltarParaConsultaAnoLetivo(page: Page): Promise<void> {
  await page.locator('#main').locator('a,button').filter({hasText: /^\s*Voltar\s*$/}).click();
  await expect(tituloConsultaAnoLetivo(page)).toBeVisible();
  await waitForSgeLoaders(page);
}

export async function pesquisarAnoLetivo(page: Page, ano: string): Promise<void> {
  await consultaAnoLetivo(page);
  const m = page.locator('#main');
  await m.locator('#searchTerm').fill(ano);
  const [r] = await Promise.all([
    page.waitForResponse(x => {
      const u = new URL(x.url());
      return u.pathname.toLowerCase() === `${rota}/indexgrid` && u.searchParams.get('searchTerm') === ano && x.request().method() === 'GET';
    }, {timeout: 20000}),
    // A pesquisa desta tela não tem id no botão: é o único submit da consulta.
    m.locator('button[type="submit"]').click(),
  ]);
  if (!r.ok()) throw new Error(`Pesquisa retornou HTTP ${r.status()}.`);
  await waitForSgeLoaders(page);
}
