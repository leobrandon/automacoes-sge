import { expect, type Page } from '@playwright/test';
import { isFormulaAprovacaoQAAuto } from '../factories/formula-aprovacao.factory';
import {
  linhaFormulaAprovacao,
  pesquisarFormulaAprovacao,
} from '../helpers/navigation/formula-aprovacao.navigation';

export async function excluirFormulaAprovacao(page: Page, descricao: string): Promise<string> {
  const alvo = descricao.trim();
  if (!isFormulaAprovacaoQAAuto(alvo)) throw new Error('A exclusão exige descrição QAAUTO.');
  await pesquisarFormulaAprovacao(page, alvo);
  const linha = linhaFormulaAprovacao(page, alvo);
  await expect(linha).toHaveCount(1);
  // O tooltip remove o atributo title do link; o onclick é estável.
  await linha.locator('a[onclick^="removerFormulaDeAprovacao"]').click();
  const confirmacao = page
    .getByRole('dialog')
    .filter({ hasText: 'Tem certeza que deseja remover essa fórmula de aprovação?' });
  await expect(confirmacao).toBeVisible();
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();
  const sucesso = page.getByRole('dialog').filter({ hasText: 'Fórmula de aprovação removida.' });
  await expect(sucesso).toBeVisible();
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await pesquisarFormulaAprovacao(page, alvo);
  await expect(linhaFormulaAprovacao(page, alvo)).toHaveCount(0);
  return alvo;
}
