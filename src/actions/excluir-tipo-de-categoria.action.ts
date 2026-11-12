import { expect, type Page } from '@playwright/test';
import {
  concluirAlertaSge,
  confirmarAlertaSge,
  exigirTermoQaauto,
  excluirRegistrosQaauto,
  fecharModalSge,
  linhaPorDescricao,
  modalSge,
  pesquisarItemConfiguracao,
  type LoteExclusaoQaauto,
} from '../helpers/navigation/itens-configuracao.navigation';

export interface TipoDeCategoriaExcluido {
  descricao: string;
  url: string;
}

/** Exclui o tipo de descrição exata: a grade só tem "Editar"; o botão Excluir fica no modal de edição. */
export async function excluirTipoDeCategoria(page: Page, descricao: string): Promise<TipoDeCategoriaExcluido> {
  const alvo = descricao.trim();
  if (!alvo) throw new Error('Informe a descrição exata do Tipo de Categoria.');
  console.log(`\n🧹 Tipo de Categoria a ser excluído: "${alvo}"`);

  await pesquisarItemConfiguracao(page, 'Tipo de Categoria', alvo);
  const linha = linhaPorDescricao(page, alvo);
  await expect(linha).toHaveCount(1);
  await linha.locator('button[title="Editar"]').click();

  const modal = modalSge(page, '#formTipoCategoriaGeral');
  await expect(modal.locator('#Descricao')).toHaveValue(alvo);
  await modal.getByRole('button', { name: 'Excluir' }).click();
  await confirmarAlertaSge(page);
  await concluirAlertaSge(page, `Exclusão do Tipo de Categoria "${alvo}" não confirmada`);
  await fecharModalSge(modal);

  await pesquisarItemConfiguracao(page, 'Tipo de Categoria', alvo);
  await expect(linhaPorDescricao(page, alvo)).toHaveCount(0);
  console.log(`✅ Tipo de Categoria excluído e ausente da consulta: "${alvo}"`);
  return { descricao: alvo, url: page.url() };
}

/** Exclui os tipos cuja descrição contém QAAUTO. */
export async function excluirTiposDeCategoriaEmLote(page: Page, termo = 'QAAUTO'): Promise<LoteExclusaoQaauto> {
  exigirTermoQaauto(termo);
  return excluirRegistrosQaauto(page, 'Tipo de Categoria', 0, (descricao) => excluirTipoDeCategoria(page, descricao));
}
