import { expect, type Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

export async function consultaFormulaAprovacao(page: Page): Promise<void> {
  const main = page.locator('#main');
  const titulo = main.locator('h4').filter({ hasText: 'Fórmulas de Aprovação' });
  if (await titulo.isVisible()) return;
  const nav = page.locator('nav');
  const ensino = nav.locator('a:visible').filter({ hasText: /^\s*Ensino\s*$/ });
  const destino = nav.getByText('Fórmula de Aprovação', { exact: true });
  if (!(await ensino.isVisible())) await page.getByTitle('Mostar/Esconder Menu').click();
  if (!(await destino.isVisible())) await ensino.click();
  await destino.click();
  await expect(titulo).toBeVisible();
  await waitForSgeLoaders(page);
}

export const linhaFormulaAprovacao = (page: Page, descricao: string) =>
  page
    .locator('#main table tbody tr:visible')
    .filter({ has: page.locator('td').getByText(descricao, { exact: true }) });

export async function pesquisarFormulaAprovacao(page: Page, descricao: string): Promise<void> {
  await consultaFormulaAprovacao(page);
  await page.locator('#main #searchTerm').fill(descricao);
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.toLowerCase().includes('/formulaaprovacao/indexgrid') &&
        new URL(r.url()).searchParams.get('searchTerm') === descricao &&
        r.request().method() === 'GET',
    ),
    page.locator('#main #btnSubmitSearch').click(),
  ]);
  if (!resposta.ok()) throw new Error(`Pesquisa de fórmula retornou HTTP ${resposta.status()}.`);
  await waitForSgeLoaders(page);
}
