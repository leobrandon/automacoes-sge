import { expect, type Page } from '@playwright/test';
import {
  avisoTipoRefeicao,
  linhaTipoRefeicao,
  pesquisarTipoRefeicao,
} from '../helpers/navigation/tipo-refeicao.navigation';
export async function excluirTipoRefeicao(page: Page, nome: string): Promise<void> {
  if (!/^QAAUTO\b/i.test(nome.trim())) throw new Error('Exclusão exige nome QAAUTO.');
  await pesquisarTipoRefeicao(page, nome);
  const linha = linhaTipoRefeicao(page, nome);
  await expect(linha).toHaveCount(1);
  await linha.click();
  const m = page.locator('#main');
  await expect(m.locator('#Nome')).toHaveValue(nome);
  await expect(m.locator('#btnExcluir')).toBeVisible();
  await m.locator('#btnExcluir').click();
  const d = page
    .getByRole('dialog')
    .filter({ hasText: 'Deseja realmente excluir esse tipo de refeição?' });
  await expect(d).toBeVisible();
  await d.getByRole('button', { name: 'Sim', exact: true }).click();
  await avisoTipoRefeicao(page, /Tipo de refeição excluído\./i);
  await pesquisarTipoRefeicao(page, nome);
  await expect(linhaTipoRefeicao(page, nome)).toHaveCount(0);
}
