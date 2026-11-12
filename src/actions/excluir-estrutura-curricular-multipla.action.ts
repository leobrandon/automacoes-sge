import { expect, type Page } from '@playwright/test';
import {
  linhaEstruturaCurricular,
  pesquisarEstruturaCurricular,
} from '../helpers/navigation/estrutura-curricular-multipla.navigation';

export async function excluirEstruturaCurricularMultipla(
  page: Page,
  descricao: string,
): Promise<string> {
  const alvo = descricao.trim();
  if (!/^QAAUTO\b/i.test(alvo)) throw new Error('A exclusão exige descrição QAAUTO.');
  await pesquisarEstruturaCurricular(page, alvo);
  const linha = linhaEstruturaCurricular(page, alvo);
  await expect(linha).toHaveCount(1);
  await linha.click();
  const main = page.locator('#main');
  await expect(main.locator('#Descricao')).toHaveValue(alvo);
  await main.locator('#btn-remove').click();
  const confirmacao = page
    .getByRole('dialog')
    .filter({ hasText: 'Tem certeza que deseja remover essa estrutura curricular múltipla?' });
  await expect(confirmacao).toBeVisible();
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();
  const sucesso = page.getByRole('dialog').filter({ hasText: 'Estrutura removida.' });
  await expect(sucesso).toBeVisible();
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await pesquisarEstruturaCurricular(page, alvo);
  await expect(linhaEstruturaCurricular(page, alvo)).toHaveCount(0);
  return alvo;
}
