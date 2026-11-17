import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { entrarNaUnidadeEscolar } from './conselho-escolar.navigation';
import { loginSge, waitForSgeLoaders } from './common.navigation';

/**
 * Entra na visão Unidade Escolar da escola. Com SGE_USUARIO_UNIDADE/SGE_SENHA_UNIDADE no .env,
 * loga direto como usuário da unidade; sem elas, loga como Secretaria e usa "Autenticar Unidade".
 */
export async function loginNaUnidadeEscolar(page: Page, escola: string, baseUrl?: string): Promise<void> {
  const usuario = process.env.SGE_USUARIO_UNIDADE;
  const senha = process.env.SGE_SENHA_UNIDADE;
  if (Boolean(usuario) !== Boolean(senha))
    throw new Error('Defina SGE_USUARIO_UNIDADE e SGE_SENHA_UNIDADE juntas no .env.');
  await loginSge(page, { baseUrl, ...(usuario && senha ? { usuario, senha } : {}), timeout: 60000 });
  await entrarNaUnidadeEscolar(page, escola);
}

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
