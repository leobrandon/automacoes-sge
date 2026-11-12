import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const rota = '/resolucoes';
export const modalResolucao = (page: Page): Locator => page.locator('#modalResolucoes:visible');
export function linhaResolucao(page: Page, descricao: string): Locator {
  return page
    .locator('#main table tbody tr:visible')
    .filter({ has: getByRoleSge(page, 'cell', { name: descricao, exact: true }) });
}
export async function navegarParaConsultaResolucao(page: Page): Promise<void> {
  const main = page.locator('#main');
  const titulo = main.locator('h4').filter({ hasText: /Resoluções/i });
  if (await titulo.isVisible()) return;
  const nav = page.locator('nav');
  const grupo = nav.locator('a[title="Alimentação escolar"]');
  const basicos = nav.locator('a').filter({ hasText: /^\s*Cadastros Básicos\s*$/ });
  const destino = nav.locator('a').filter({ hasText: /^\s*Resoluções\s*$/ });
  if (!(await grupo.isVisible())) await page.getByTitle('Mostar/Esconder Menu').click();
  if (!(await basicos.isVisible())) await grupo.click();
  if (!(await destino.isVisible())) await basicos.click();
  await expect(destino).toBeVisible();
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.toLowerCase().replace(/\/$/, '') === rota &&
        r.request().method() === 'GET',
    ),
    destino.click(),
  ]);
  if (!resposta.ok()) throw new Error(`Consulta de Resoluções retornou HTTP ${resposta.status()}.`);
  await expect(titulo).toBeVisible();
  await waitForSgeLoaders(page);
  await expect(main.locator('#searchTerm')).toBeVisible();
}
export async function pesquisarResolucao(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaResolucao(page);
  await page.locator('#main #searchTerm').fill(termo);
  const [resposta] = await Promise.all([
    page.waitForResponse((r) => {
      const u = new URL(r.url());
      return (
        u.pathname.toLowerCase().replace(/\/$/, '') === `${rota}/indexgrid` &&
        u.searchParams.get('searchTerm') === termo &&
        r.request().method() === 'GET'
      );
    }),
    page.locator('#main #btnSubmitSearch').click(),
  ]);
  if (!resposta.ok()) throw new Error(`Pesquisa de Resoluções retornou HTTP ${resposta.status()}.`);
  await waitForSgeLoaders(page);
}
export async function confirmarAvisoResolucao(page: Page, texto: RegExp): Promise<void> {
  const aviso = page.getByRole('dialog').filter({ hasText: texto });
  await expect(aviso).toBeVisible();
  await aviso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(aviso).toBeHidden();
}
