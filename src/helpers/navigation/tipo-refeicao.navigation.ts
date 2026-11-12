import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';
export const linhaTipoRefeicao = (page: Page, nome: string) =>
  page
    .locator('#main table tbody tr:visible')
    .filter({ has: getByRoleSge(page, 'cell', { name: nome, exact: true }) });
export async function consultaTipoRefeicao(page: Page): Promise<void> {
  const m = page.locator('#main');
  if (await m.locator('h4').filter({ hasText: 'Tipos de Refeição' }).isVisible()) return;
  const nav = page.locator('nav'),
    pai = nav.locator('a[title="Alimentação escolar"]'),
    basicos = nav.locator('a').filter({ hasText: /^\s*Cadastros Básicos\s*$/ }),
    destino = nav.locator('a').filter({ hasText: /^\s*Tipo de Refeição\s*$/ });
  if (!(await pai.isVisible())) await page.getByTitle('Mostar/Esconder Menu').click();
  if (!(await basicos.isVisible())) await pai.click();
  if (!(await destino.isVisible())) await basicos.click();
  const [r] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.toLowerCase() === '/tipoderefeicao' &&
        r.request().method() === 'GET',
    ),
    destino.click(),
  ]);
  if (!r.ok()) throw new Error(`Consulta de Tipo de Refeição: HTTP ${r.status()}.`);
  await expect(m.locator('h4').filter({ hasText: 'Tipos de Refeição' })).toBeVisible();
  await waitForSgeLoaders(page);
}
export async function pesquisarTipoRefeicao(page: Page, nome: string): Promise<void> {
  await consultaTipoRefeicao(page);
  const m = page.locator('#main');
  await m.locator('#searchTerm').fill(nome);
  const [r] = await Promise.all([
    page.waitForResponse((r) => {
      const u = new URL(r.url());
      return (
        u.pathname.toLowerCase() === '/tipoderefeicao/indexgrid' &&
        u.searchParams.get('searchTerm') === nome &&
        r.request().method() === 'GET'
      );
    }),
    m.locator('#btnSubmitSearch').click(),
  ]);
  if (!r.ok()) throw new Error(`Pesquisa de Tipo de Refeição: HTTP ${r.status()}.`);
  await waitForSgeLoaders(page);
}
export async function avisoTipoRefeicao(page: Page, texto: RegExp): Promise<void> {
  const d = page.getByRole('dialog').filter({ hasText: texto });
  await expect(d).toBeVisible();
  await d.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(d).toBeHidden();
}
