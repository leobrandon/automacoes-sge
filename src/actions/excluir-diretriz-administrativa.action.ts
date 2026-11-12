import {expect, type Page} from '@playwright/test';
import type {AlvoDiretrizAdministrativa} from '../factories/diretriz-administrativa.factory';
import {colunaDiretriz, linhasDiretrizAdministrativa} from '../helpers/navigation/diretriz-administrativa.navigation';

/**
 * Exclui a diretriz que bate exatamente com unidade, função, cargo, turno, horas e vagas.
 * Recusa excluir se houver mais de uma linha igual ou se a diretriz já tiver modulações.
 */
export async function excluirDiretrizAdministrativa(page: Page, alvo: AlvoDiretrizAdministrativa): Promise<void> {
  const linhas = await linhasDiretrizAdministrativa(page, alvo);
  await expect(linhas, 'A exclusão exige exatamente uma diretriz com esses dados.').toHaveCount(1);
  await expect(linhas).toBeVisible();
  await expect(linhas.locator(`td:nth-child(${colunaDiretriz.moduladas})`), 'A diretriz possui modulações e não será excluída.').toHaveText('0');
  await linhas.locator(`td:nth-child(${colunaDiretriz.unidade})`).click();

  const m = page.locator('#main');
  await expect(m.locator('h4').filter({hasText: 'Editar Diretriz'})).toBeVisible();
  await expect(m.locator('#Turno')).toHaveValue(alvo.turno);
  await expect(m.locator('#QuantidadeDeVagas')).toHaveValue(alvo.vagas);
  await m.locator('#btn_excluir').click();
  const confirmacao = page.locator('.MessageBoxContainer').filter({hasText: 'Tem certeza que deseja excluir?'});
  await expect(confirmacao).toBeVisible();
  const [exclusao] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase().startsWith('/diretriz/excluir/') && x.request().method() === 'GET', {timeout: 30000}),
    confirmacao.getByRole('button', {name: 'Sim', exact: true}).click(),
  ]);
  if (!exclusao.ok()) throw new Error(`Exclusão da diretriz: HTTP ${exclusao.status()}.`);
  await expect(confirmacao).toBeHidden();
  // O toast "Diretriz excluída com sucesso!" some em segundos; a prova é a ausência na grade.
  await expect(await linhasDiretrizAdministrativa(page, alvo)).toHaveCount(0);
}
