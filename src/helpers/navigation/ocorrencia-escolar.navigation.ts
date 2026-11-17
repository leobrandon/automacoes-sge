import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaOcorrencia(page: Page): Locator {
  return main(page).locator('h4').filter({ hasText: /Consulta de Ocorrência Escolar/ });
}

/**
 * Navega pelo menu visível Escola > Ocorrências > Escolares. A inclusão só funciona na visão
 * Unidade Escolar (chame `entrarNaUnidadeEscolar` antes).
 */
export async function navegarParaOcorrenciaEscolar(page: Page): Promise<void> {
  await expect(
    page.locator('header').getByText('Unidade Escolar', { exact: true }),
    'Chame entrarNaUnidadeEscolar antes: a ocorrência escolar é registrada na visão Unidade Escolar.',
  ).toBeVisible({ timeout: 15000 });

  const nav = page.locator('nav');
  const escola = nav.getByRole('link', { name: /^\W*Escola\W*$/ });
  const ocorrencias = nav.getByRole('link', { name: /^\W*Ocorrências\W*$/ });
  const escolares = nav.getByRole('link', { name: /^\W*Escolares\W*$/ });

  await waitForSgeLoaders(page);
  if (!await escolares.isVisible()) {
    if (!await ocorrencias.isVisible()) {
      await escola.waitFor({ state: 'visible', timeout: 15000 });
      await escola.click();
    }
    await ocorrencias.waitFor({ state: 'visible', timeout: 15000 });
    await ocorrencias.click();
  }
  await escolares.waitFor({ state: 'visible', timeout: 15000 });
  await escolares.click();

  await expect(tituloConsultaOcorrencia(page)).toBeVisible({ timeout: 30000 });
  await waitForSgeLoaders(page);
  await getByRoleSge(main(page), 'button', { name: /Adicionar/ }).first().waitFor({ state: 'visible', timeout: 15000 });
}

/** Linha da grade identificada pelo número da ocorrência (primeira coluna). */
export function linhaOcorrencia(page: Page, numero: string): Locator {
  return main(page).locator('table tbody tr').filter({
    has: getByRoleSge(page, 'cell', { name: numero, exact: true }),
  });
}
