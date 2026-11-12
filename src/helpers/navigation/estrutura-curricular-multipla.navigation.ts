import { expect, type Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

export async function consultaEstruturaCurricular(page: Page): Promise<void> {
  const main = page.locator('#main');
  const titulo = main
    .locator('h4')
    .filter({ hasText: 'Consulta de Estrutura Curricular Múltipla' });
  if (await titulo.isVisible()) return;
  const nav = page.locator('nav');
  const ensino = nav.locator('a:visible').filter({ hasText: /^\s*Ensino\s*$/ });
  const destino = nav.getByText('Estrutura Curricular Múltipla', { exact: true });
  if (!(await ensino.isVisible())) await page.getByTitle('Mostar/Esconder Menu').click();
  if (!(await destino.isVisible())) await ensino.click();
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.toLowerCase() === '/estruturacurricularmultipla' &&
        r.request().method() === 'GET',
    ),
    destino.click(),
  ]);
  if (!resposta.ok()) throw new Error(`Consulta de estrutura retornou HTTP ${resposta.status()}.`);
  await expect(titulo).toBeVisible();
  await waitForSgeLoaders(page);
}

export const linhaEstruturaCurricular = (page: Page, descricao: string) =>
  page
    .locator('#main table tbody tr:visible')
    .filter({ has: page.locator('td').getByText(descricao, { exact: true }) });

export async function pesquisarEstruturaCurricular(page: Page, descricao: string): Promise<void> {
  await consultaEstruturaCurricular(page);
  await page.locator('#main #searchTerm').fill(descricao);
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname
          .toLowerCase()
          .includes('/estruturacurricularmultipla/indexgrid') &&
        new URL(r.url()).searchParams.get('searchTerm') === descricao &&
        r.request().method() === 'GET',
    ),
    page
      .locator('#main form')
      .filter({ has: page.locator('#searchTerm') })
      .locator('button[type="submit"]')
      .click(),
  ]);
  if (!resposta.ok()) throw new Error(`Pesquisa de estrutura retornou HTTP ${resposta.status()}.`);
  await waitForSgeLoaders(page);
}
