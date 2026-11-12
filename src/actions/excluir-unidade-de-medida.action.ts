import { expect, type Page } from '@playwright/test';
import {
  concluirAlertaSge,
  confirmarAlertaSge,
  exigirTermoQaauto,
  excluirRegistrosQaauto,
  linhaPorDescricao,
  pesquisarItemConfiguracao,
  type LoteExclusaoQaauto,
} from '../helpers/navigation/itens-configuracao.navigation';

export interface UnidadeDeMedidaExcluida {
  descricao: string;
  url: string;
}

/** Exclui a unidade de descrição exata (única na grade) pela lixeira da linha. */
export async function excluirUnidadeDeMedida(page: Page, descricao: string): Promise<UnidadeDeMedidaExcluida> {
  const alvo = descricao.trim();
  if (!alvo) throw new Error('Informe a descrição exata da Unidade de Medida.');
  console.log(`\n🧹 Unidade de Medida a ser excluída: "${alvo}"`);

  await pesquisarItemConfiguracao(page, 'Unidades de Medida', alvo);
  const linha = linhaPorDescricao(page, alvo);
  await expect(linha).toHaveCount(1);
  await linha.locator('a[title^="Excluir"]').click();
  await confirmarAlertaSge(page);
  await concluirAlertaSge(page, `Exclusão da Unidade de Medida "${alvo}" não confirmada`);

  await pesquisarItemConfiguracao(page, 'Unidades de Medida', alvo);
  await expect(linhaPorDescricao(page, alvo)).toHaveCount(0);
  console.log(`✅ Unidade de Medida excluída e ausente da consulta: "${alvo}"`);
  return { descricao: alvo, url: page.url() };
}

/** Exclui as unidades cuja descrição contém QAAUTO (primeira página da busca, repetida até esgotar). */
export async function excluirUnidadesDeMedidaEmLote(page: Page, termo = 'QAAUTO'): Promise<LoteExclusaoQaauto> {
  exigirTermoQaauto(termo);
  return excluirRegistrosQaauto(page, 'Unidades de Medida', 1, (descricao) => excluirUnidadeDeMedida(page, descricao));
}
