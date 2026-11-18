import { expect, type Page } from '@playwright/test';
import { confirmarSucessoOcorrenciaSaude } from '../helpers/navigation/ocorrencia-saude-colaborador.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  COLABORADOR_OCORRENCIA_QAAUTO,
  validarMotivoCancelamentoOcorrenciaSaude,
} from '../factories/ocorrencia-saude-colaborador.factory';

export async function cancelarOcorrenciaSaudeColaborador(page: Page, id: string, motivo: string): Promise<void> {
  if (!id.trim()) throw new Error('O cancelamento exige o identificador do rascunho de teste.');
  const motivoValidado = validarMotivoCancelamentoOcorrenciaSaude(motivo);
  const main = page.locator('#main');
  const idEmEdicao = main.locator('form input[type="hidden"]#Id');
  const situacao = main.locator('#SituacaoDescricao');
  await expect(idEmEdicao).toHaveValue(id);
  await expect(main.locator('#PessoaNome')).toHaveValue(COLABORADOR_OCORRENCIA_QAAUTO);
  await expect(situacao).toHaveValue('Rascunho');

  const cancelar = getByRoleSge(main, 'button', { name: /Cancelar/ });
  await expect(cancelar).toBeVisible();
  await cancelar.click();
  const confirmacao = page.getByRole('dialog').filter({
    visible: true,
    hasText: 'Tem certeza que deseja cancelar essa ocorrência?',
  });
  await expect(confirmacao).toBeVisible();
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();
  const dialogoMotivo = page.getByRole('dialog').filter({
    visible: true,
    has: page.getByRole('heading', { name: 'Informe o Motivo', exact: true }),
  });
  await expect(dialogoMotivo).toBeVisible();
  await dialogoMotivo.locator('#MotivoCancelamentoModal').fill(motivoValidado);
  await dialogoMotivo.getByRole('button', { name: 'Prosseguir', exact: true }).click();
  await confirmarSucessoOcorrenciaSaude(page, 'A ocorrência de saúde foi cancelada.');
  await expect(idEmEdicao).toHaveValue(id);
  await expect(situacao).toHaveValue('Cancelada');
}
