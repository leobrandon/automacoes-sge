import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';

export async function abrirFormularioOcorrenciaSaudeColaborador(page: Page): Promise<void> {
  const nav = page.locator('nav');
  const ocorrencias = nav.getByRole('link', { name: 'Ocorrências de Saúde', exact: true });
  if (!await ocorrencias.isVisible()) {
    await nav.getByRole('link', { name: /^\W*Colaborador\W*$/ }).click();
  }
  await expect(ocorrencias).toBeVisible();
  await ocorrencias.click();

  const main = page.locator('#main');
  await expect(getByRoleSge(main, 'heading', { name: /Consulta de Ocorrências de Saúde de\s+Colaboradores/ })).toBeVisible();
  const adicionar = getByRoleSge(main, 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await expect(getByRoleSge(main, 'heading', { name: /Adicionar Ocorrência de Saúde de Colaborador/ })).toBeVisible();
}

export async function confirmarSucessoOcorrenciaSaude(page: Page, mensagem: string): Promise<void> {
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  await expect(dialogo).toContainText(mensagem);
  await dialogo.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(dialogo).toBeHidden();
}
