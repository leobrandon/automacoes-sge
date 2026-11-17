import { expect, type Page } from '@playwright/test';
import { confirmarSucessoOcorrenciaSaude } from '../helpers/navigation/ocorrencia-saude-colaborador.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export async function cancelarOcorrenciaSaudeColaborador(page: Page, id: string, motivo: string): Promise<void> {
  if (!id.trim()) throw new Error('O cancelamento exige o identificador da ocorrência criada nesta execução.');
  const main = page.locator('#main');
  const idEmEdicao = main.locator('form input[type="hidden"]#Id');
  const situacao = main.locator('#SituacaoDescricao');
  await expect(idEmEdicao).toHaveValue(id);
  await expect(main.locator('#PessoaNome')).toHaveValue(/\bQAAUTO\b/i);
  await expect(situacao).toHaveValue('Rascunho');

  const cancelar = getByRoleSge(main, 'button', { name: /Cancelar/ });
  await expect(cancelar).toBeVisible();
  await cancelar.click();
  const dialogo = page.getByRole('dialog');
  await expect(dialogo).toContainText('Tem certeza que deseja cancelar essa ocorrência?');
  await dialogo.getByRole('button', { name: 'Sim', exact: true }).click();
  await expect(dialogo.getByRole('heading', { name: 'Informe o Motivo' })).toBeVisible();
  await dialogo.locator('#MotivoCancelamentoModal').fill(motivo);
  await dialogo.getByRole('button', { name: 'Prosseguir', exact: true }).click();
  await confirmarSucessoOcorrenciaSaude(page, 'A ocorrência de saúde foi cancelada.');
  await expect(idEmEdicao).toHaveValue(id);
  await expect(situacao).toHaveValue('Cancelada');
}
