import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';
const rota = '/grupoanosescolaresalimentacao';
export const linhaGrupoAnos = (page: Page, nome: string) =>
  page
    .locator('#main table tbody tr:visible')
    .filter({ has: getByRoleSge(page, 'cell', { name: nome, exact: true }) });
export async function consultaGrupoAnos(page: Page): Promise<void> {
  const m = page.locator('#main');
  if (await m.locator('h4').filter({ hasText: 'Consulta de Grupos de Anos Escolares' }).isVisible())
    return;
  const n = page.locator('nav'),
    p = n.locator('a[title="Alimentação escolar"]'),
    b = n.locator('a').filter({ hasText: /^\s*Cadastros Básicos\s*$/ }),
    d = n.locator('a').filter({ hasText: /^\s*Grupo de Anos Escolares\s*$/ });
  if (!(await p.isVisible())) await page.getByTitle('Mostar/Esconder Menu').click();
  if (!(await b.isVisible())) await p.click();
  if (!(await d.isVisible())) await b.click();
  const [r] = await Promise.all([
    page.waitForResponse(
      (r) => new URL(r.url()).pathname.toLowerCase() === rota && r.request().method() === 'GET',
    ),
    d.click(),
  ]);
  if (!r.ok()) throw new Error(`Consulta de Grupo de Anos Escolares: HTTP ${r.status()}.`);
  await expect(
    m.locator('h4').filter({ hasText: 'Consulta de Grupos de Anos Escolares' }),
  ).toBeVisible();
  await waitForSgeLoaders(page);
}
export async function pesquisarGrupoAnos(page: Page, nome: string): Promise<void> {
  await consultaGrupoAnos(page);
  const m = page.locator('#main');
  await m.locator('#searchTerm').fill(nome);
  const [r] = await Promise.all([
    page.waitForResponse((r) => {
      const u = new URL(r.url());
      return (
        u.pathname.toLowerCase() === `${rota}/indexgrid` &&
        u.searchParams.get('searchTerm') === nome &&
        r.request().method() === 'GET'
      );
    }),
    m.locator('#btnSubmitSearch').click(),
  ]);
  if (!r.ok()) throw new Error(`Pesquisa retornou HTTP ${r.status()}.`);
  await waitForSgeLoaders(page);
}
export async function avisoGrupoAnos(page: Page, texto: RegExp): Promise<void> {
  const d = page.getByRole('dialog').filter({ hasText: texto });
  await expect(d).toBeVisible();
  await d.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(d).toBeHidden();
}
