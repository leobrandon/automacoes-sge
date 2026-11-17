import { expect, type Page } from '@playwright/test';
import type { ConfiguracaoAnoEscolarAlvo } from '../../factories/configurar-ano-escolar.factory';
import { waitForSgeLoaders } from './common.navigation';

export async function consultaConfiguracaoAnoEscolar(page: Page): Promise<void> {
  const main = page.locator('#main');
  const titulo = main
    .locator('h4')
    .filter({ hasText: 'Consulta de Ano Escolar da Composição De Ensino' });
  if (await titulo.isVisible()) return;
  const nav = page.locator('nav');
  const ensino = nav.locator('a:visible').filter({ hasText: /^\s*Ensino\s*$/ });
  const destino = nav.getByText('Configurar Ano Escolar', { exact: true });
  if (!(await ensino.isVisible())) await page.getByTitle('Mostar/Esconder Menu').click();
  if (!(await destino.isVisible())) await ensino.click();
  await destino.click();
  await expect(titulo).toBeVisible();
  await waitForSgeLoaders(page);
}

export const linhaConfiguracaoAnoEscolar = (page: Page, alvo: ConfiguracaoAnoEscolarAlvo) =>
  page
    .locator('#main table tbody tr:visible')
    .filter({ has: page.locator('td').getByText(alvo.anoEscolar, { exact: true }) })
    .filter({ has: page.locator('td').getByText(alvo.composicaoEnsino, { exact: true }) })
    .filter({ has: page.locator('td').getByText(alvo.calendarioEscolar, { exact: true }) });

/** Pesquisa pelo nome do calendário escolar (a grade filtra por qualquer coluna). */
export async function pesquisarConfiguracaoAnoEscolar(page: Page, termo: string): Promise<void> {
  await consultaConfiguracaoAnoEscolar(page);
  await page.locator('#main #searchTerm').fill(termo);
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.toLowerCase().includes('/seriecomposicao/indexgrid') &&
        r.request().method() === 'POST',
    ),
    page
      .locator('#main form#searchForm')
      .locator('button[type="submit"]')
      .click(),
  ]);
  if (!resposta.ok()) throw new Error(`Pesquisa de ano escolar retornou HTTP ${resposta.status()}.`);
  await waitForSgeLoaders(page);
  // A grade pagina de 10 em 10; amplia para que a linha alvo nunca fique em outra página.
  // Sem resultados a grade não renderiza o rodapé nem o seletor de tamanho.
  const tamanho = page.locator('#main #QuantidadeItensPorPagina_grid');
  if ((await tamanho.count()) === 0) return;
  await expect(tamanho).toBeVisible();
  const [ampliada] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.toLowerCase().includes('/seriecomposicao/indexgrid') &&
        new URL(r.url()).searchParams.get('pageSize') === '100',
    ),
    tamanho.selectOption('100'),
  ]);
  if (!ampliada.ok()) throw new Error(`Paginação da grade retornou HTTP ${ampliada.status()}.`);
  await waitForSgeLoaders(page);
  await expect(page.locator('#main #QuantidadeItensPorPagina_grid')).toHaveValue('100');
}
