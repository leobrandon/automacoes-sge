import {expect, type Page} from '@playwright/test';
import type {AlvoModulacaoAdministrativa} from '../factories/modulacao-administrativa.factory';
import {linhasModulacaoAdministrativa} from '../helpers/navigation/modulacao-administrativa.navigation';

/** Exclui a modulação do servidor QAAUTO informado (única linha que bate com unidade, cargo, função e turno). */
export async function excluirModulacaoAdministrativa(page: Page, alvo: AlvoModulacaoAdministrativa): Promise<void> {
  if (!/QAAUTO/i.test(alvo.colaborador)) throw new Error('A exclusão exige servidor QAAUTO.');
  const linhas = await linhasModulacaoAdministrativa(page, alvo);
  await expect(linhas).toHaveCount(1);
  await expect(linhas).toBeVisible();
  await linhas.getByTitle('Excluir', {exact: true}).click();
  const confirmacao = page.getByRole('dialog').filter({hasText: 'Essa ação deletará a modulação desse colaborador.'});
  await expect(confirmacao).toBeVisible();
  await confirmacao.getByRole('button', {name: 'Sim', exact: true}).click();
  await expect(confirmacao).toBeHidden();
  await expect(await linhasModulacaoAdministrativa(page, alvo)).toHaveCount(0);
}
