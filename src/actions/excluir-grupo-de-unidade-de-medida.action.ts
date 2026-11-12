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

export interface GrupoDeUnidadeDeMedidaExcluido {
  descricao: string;
  url: string;
}

/** Exclui o grupo de descrição exata (único na grade) pela lixeira da linha. */
export async function excluirGrupoDeUnidadeDeMedida(page: Page, descricao: string): Promise<GrupoDeUnidadeDeMedidaExcluido> {
  const alvo = descricao.trim();
  if (!alvo) throw new Error('Informe a descrição exata do Grupo de Unidade de Medida.');
  console.log(`\n🧹 Grupo de Unidade de Medida a ser excluído: "${alvo}"`);

  await pesquisarItemConfiguracao(page, 'Grupos de Unidade de Medida', alvo);
  const linha = linhaPorDescricao(page, alvo);
  await expect(linha).toHaveCount(1);
  await linha.locator('a[title^="Excluir"]').click();
  await confirmarAlertaSge(page);
  await concluirAlertaSge(page, `Exclusão do Grupo de Unidade de Medida "${alvo}" não confirmada`);

  await pesquisarItemConfiguracao(page, 'Grupos de Unidade de Medida', alvo);
  await expect(linhaPorDescricao(page, alvo)).toHaveCount(0);
  console.log(`✅ Grupo de Unidade de Medida excluído e ausente da consulta: "${alvo}"`);
  return { descricao: alvo, url: page.url() };
}

/** Exclui os grupos cuja descrição contém QAAUTO. */
export async function excluirGruposDeUnidadeDeMedidaEmLote(page: Page, termo = 'QAAUTO'): Promise<LoteExclusaoQaauto> {
  exigirTermoQaauto(termo);
  return excluirRegistrosQaauto(page, 'Grupos de Unidade de Medida', 1, (descricao) =>
    excluirGrupoDeUnidadeDeMedida(page, descricao),
  );
}
