import {expect, type Locator, type Page} from '@playwright/test';
import {getByRoleSge} from '../sge-locators.helper';
import {waitForSgeLoaders} from './common.navigation';

const rota = '/necessidadesnutricionais';
const tituloConsulta = 'Necessidades Nutricionais';

export const linhaNecessidade = (page: Page, resolucao: string, grupo: string, atendimento: string): Locator =>
  page.locator('#main table tbody tr:visible')
    .filter({has: getByRoleSge(page, 'cell', {name: resolucao, exact: true})})
    .filter({has: getByRoleSge(page, 'cell', {name: grupo, exact: true})})
    .filter({has: getByRoleSge(page, 'cell', {name: atendimento, exact: true})});

export async function consultaNecessidade(page: Page): Promise<void> {
  const m = page.locator('#main');
  const titulo = m.locator('h4').filter({hasText: tituloConsulta});
  if (await titulo.isVisible()) return;
  const n = page.locator('nav');
  const pai = n.locator('a[title="Alimentação escolar"]');
  const item = n.locator('a').filter({hasText: /^\s*Necessidades Nutricionais\s*$/});
  if (!await pai.isVisible()) await page.getByTitle('Mostar/Esconder Menu').click();
  if (!await item.isVisible()) await pai.click();
  const [r] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase() === rota && x.request().method() === 'GET'),
    item.click(),
  ]);
  if (!r.ok()) throw new Error(`Consulta de Necessidades Nutricionais: HTTP ${r.status()}.`);
  await expect(titulo).toBeVisible();
  await waitForSgeLoaders(page);
}

export async function voltarParaConsultaNecessidade(page: Page): Promise<void> {
  const m = page.locator('#main');
  const [r] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase() === rota && x.request().method() === 'GET'),
    m.locator('a,button').filter({hasText: /^\s*Voltar\s*$/}).click(),
  ]);
  if (!r.ok()) throw new Error(`Retorno à consulta: HTTP ${r.status()}.`);
  await expect(m.locator('h4').filter({hasText: tituloConsulta})).toBeVisible();
  await waitForSgeLoaders(page);
}

export async function pesquisarNecessidade(page: Page, termo: string): Promise<void> {
  await consultaNecessidade(page);
  const m = page.locator('#main');
  await m.locator('#searchTerm').fill(termo);
  const [r] = await Promise.all([
    page.waitForResponse(x => {
      const u = new URL(x.url());
      return u.pathname.toLowerCase() === `${rota}/indexgrid` && u.searchParams.get('searchTerm') === termo && x.request().method() === 'GET';
    }),
    m.locator('#btnSubmitSearch').click(),
  ]);
  if (!r.ok()) throw new Error(`Pesquisa retornou HTTP ${r.status()}.`);
  await waitForSgeLoaders(page);
}

export async function avisoNecessidade(page: Page, texto: RegExp): Promise<void> {
  const d = page.getByRole('dialog').filter({hasText: texto});
  await expect(d).toBeVisible();
  await d.getByRole('button', {name: 'Ok', exact: true}).click();
  await expect(d).toBeHidden();
}
