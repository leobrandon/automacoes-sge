import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';
export const linhaCalendarioEscolar = (page: Page, descricao: string) =>
  page
    .locator('#main table tbody tr:visible')
    .filter({ has: getByRoleSge(page, 'cell', { name: descricao, exact: true }) });
export async function consultaCalendarioEscolar(page: Page): Promise<void> {
  const m = page.locator('#main'),
    titulo = m.locator('h4').filter({ hasText: 'Consulta de Calendário Escolar' });
  if (await titulo.isVisible()) return;
  const n = page.locator('nav'),
    ensino = n.locator('a:visible').filter({ hasText: /^\s*Ensino\s*$/ }),
    destino = n
      .locator('a[onclick*="\'/calendarioescolar\'"]')
      .filter({ hasText: /^\s*Calendário Escolar\s*$/ });
  if (!(await ensino.isVisible())) await page.getByTitle('Mostar/Esconder Menu').click();
  if (!(await destino.isVisible())) await ensino.click();
  const [r] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.toLowerCase() === '/calendarioescolar' &&
        r.request().method() === 'GET',
      { timeout: 30000 },
    ),
    destino.click(),
  ]);
  if (!r.ok()) throw new Error(`Consulta de calendário retornou HTTP ${r.status()}.`);
  await expect(titulo).toBeVisible();
  await waitForSgeLoaders(page);
}
export async function pesquisarCalendarioEscolar(page: Page, nome: string): Promise<void> {
  await consultaCalendarioEscolar(page);
  const m = page.locator('#main');
  await m.locator('#searchTerm').fill(nome);
  const [r] = await Promise.all([
    page.waitForResponse(
      (r) => {
        const u = new URL(r.url());
        return (
          u.pathname.toLowerCase() === '/calendarioescolar/indexgrid' &&
          u.searchParams.get('searchTerm') === nome &&
          r.request().method() === 'GET'
        );
      },
      { timeout: 20000 },
    ),
    m.locator('#btnSubmitSearch').click(),
  ]);
  if (!r.ok()) throw new Error(`Pesquisa retornou HTTP ${r.status()}.`);
  await waitForSgeLoaders(page);
}
