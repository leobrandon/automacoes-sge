import { expect, type Page } from '@playwright/test';
import { isEscalaProficienciaQAAuto, type EscalaProficienciaData } from '../factories/escala-proficiencia.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  abrirEdicaoEscalaProficiencia,
  linhaEscalaProficiencia,
  navegarParaConsultaEscalaProficiencia,
  pesquisarEscalaProficiencia,
} from '../helpers/navigation/escala-proficiencia.navigation';

export async function excluirEscalaProficiencia(
  page: Page,
  escala: Pick<EscalaProficienciaData, 'codigo' | 'descricao' | 'composicaoEnsino'>,
): Promise<void> {
  if (!/^\d{1,19}$/.test(escala.codigo) || !isEscalaProficienciaQAAuto(escala.descricao)) {
    throw new Error('A exclusão exige o código e a descrição exatos de uma Escala QAAUTO.');
  }

  await abrirEdicaoEscalaProficiencia(page, escala.codigo);
  const formulario = page.locator('#main');
  await expect(formulario.locator('#Codigo')).toHaveValue(escala.codigo);
  await expect(formulario.locator('#Descricao')).toHaveValue(escala.descricao);
  await expect(formulario.locator('#s2id_ComposicaoEnsinoId .select2-chosen'))
    .toHaveText(escala.composicaoEnsino);

  const excluir = getByRoleSge(formulario, 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();
  const confirmacao = page.locator('.swal2-popup:visible');
  await expect(confirmacao).toContainText('Tem certeza que deseja excluir esta Escala de Proficiência?');
  await expect(confirmacao).toContainText('Esse processo é irreversível.');
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

  const sucesso = page.locator('.swal2-popup:visible');
  await expect(sucesso).toContainText('Escala de Proficiência excluída com sucesso.', { timeout: 20000 });
  await sucesso.getByRole('button', { name: /^(Ok|OK)$/i }).click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });
  await navegarParaConsultaEscalaProficiencia(page);
  await pesquisarEscalaProficiencia(page, escala.codigo);
  await expect(linhaEscalaProficiencia(page, escala.codigo)).toHaveCount(0);
  console.log(`[QAAUTO] Escala de Proficiência excluída: ${escala.codigo} | ${escala.descricao}`);
}
