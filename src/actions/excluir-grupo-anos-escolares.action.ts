import { expect, type Page } from '@playwright/test';
import {
  avisoGrupoAnos,
  linhaGrupoAnos,
  pesquisarGrupoAnos,
} from '../helpers/navigation/grupo-anos-escolares.navigation';
export async function excluirGrupoAnosEscolares(page: Page, nome: string): Promise<void> {
  if (!/^QAAUTO\b/i.test(nome.trim())) throw new Error('Exclusão exige descrição QAAUTO.');
  await pesquisarGrupoAnos(page, nome);
  const linha = linhaGrupoAnos(page, nome);
  await expect(linha).toHaveCount(1);
  const botao = linha.getByTitle('Excluir Grupo de Anos Escolares');
  await expect(botao).toBeVisible();
  await botao.click();
  const d = page
    .getByRole('dialog')
    .filter({ hasText: 'Deseja realmente excluir esse Grupo de Anos Escolares?' });
  await expect(d).toBeVisible();
  await d.getByRole('button', { name: 'Sim', exact: true }).click();
  await avisoGrupoAnos(page, /Grupo de anos escolares excluído\./i);
  await pesquisarGrupoAnos(page, nome);
  await expect(linhaGrupoAnos(page, nome)).toHaveCount(0);
}
