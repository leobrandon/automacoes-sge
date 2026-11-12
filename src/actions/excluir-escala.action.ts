import { expect, type Page } from '@playwright/test';
import { isEscalaQAAuto, type EscalaData } from '../factories/escala.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface EscalaExcluida {
  descricao: string;
  url: string;
}

/** Exclui pela interface somente a Escala QAAUTO que está aberta em edição. */
export async function excluirEscala(page: Page, escala: Pick<EscalaData, 'descricao'>): Promise<EscalaExcluida> {
  const descricao = escala.descricao.trim();
  if (!isEscalaQAAuto(descricao)) {
    throw new Error('A exclusão automatizada exige a descrição exata de uma Escala QAAUTO.');
  }

  const formulario = page.locator('#main');
  await expect(getByRoleSge(formulario, 'heading', { name: /Editar Escala/i })).toBeVisible();
  await expect(formulario.locator('#Descricao')).toHaveValue(descricao);

  const excluir = getByRoleSge(formulario, 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();

  await expect(page.getByText('Tem certeza que deseja excluir?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();

  await expect(getByRoleSge(formulario, 'heading', { name: /Consulta de Escalas/i }))
    .toBeVisible({ timeout: 20000 });

  console.log(`[QAAUTO] Escala excluída: ${descricao}`);
  return { descricao, url: page.url() };
}
