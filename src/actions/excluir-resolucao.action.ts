import { expect, type Page } from '@playwright/test';
import { isResolucaoQAAuto } from '../factories/resolucao.factory';
import {
  confirmarAvisoResolucao,
  linhaResolucao,
  pesquisarResolucao,
} from '../helpers/navigation/resolucao.navigation';

export async function excluirResolucao(
  page: Page,
  descricao: string,
): Promise<{ descricao: string; url: string }> {
  const alvo = descricao.trim();
  if (!isResolucaoQAAuto(alvo)) throw new Error('A exclusão requer descrição iniciada por QAAUTO.');
  await pesquisarResolucao(page, alvo);
  const linha = linhaResolucao(page, alvo);
  await expect(linha).toHaveCount(1);
  const lixeira = linha.getByTitle('Excluir Resolução');
  await expect(lixeira).toBeVisible();
  await lixeira.click();
  const dialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Tem certeza que deseja excluir essa resolução?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Sim', exact: true }).click();
  await confirmarAvisoResolucao(page, /Resolução excluída\./i);
  await pesquisarResolucao(page, alvo);
  await expect(linha).toHaveCount(0);
  return { descricao: alvo, url: page.url() };
}
