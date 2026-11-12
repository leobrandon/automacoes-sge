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

export interface CategoriaExcluida {
  nome: string;
  url: string;
}

/** Exclui a categoria de nome exato: abre a linha e usa o botão Excluir da edição (leva as subcategorias junto). */
export async function excluirCategoria(page: Page, nome: string): Promise<CategoriaExcluida> {
  const alvo = nome.trim();
  if (!alvo) throw new Error('Informe o nome exato da Categoria.');
  console.log(`\n🧹 Categoria a ser excluída: "${alvo}"`);

  await pesquisarItemConfiguracao(page, 'Categoria', alvo);
  const linha = linhaPorDescricao(page, alvo);
  await expect(linha).toHaveCount(1);
  await linha.locator('td').nth(1).click();
  await expect(page.locator('#main h4').filter({ hasText: 'Editar Categoria' })).toBeVisible();
  await expect(page.locator('#Nome')).toHaveValue(alvo);

  await page.locator('#main button').filter({ hasText: /^\s*Excluir\s*$/ }).click();
  await confirmarAlertaSge(page);
  await concluirAlertaSge(page, `Exclusão da Categoria "${alvo}" não confirmada`);

  await pesquisarItemConfiguracao(page, 'Categoria', alvo);
  await expect(linhaPorDescricao(page, alvo)).toHaveCount(0);
  console.log(`✅ Categoria excluída e ausente da consulta: "${alvo}"`);
  return { nome: alvo, url: page.url() };
}

/** Exclui as categorias cujo nome contém QAAUTO. */
export async function excluirCategoriasEmLote(page: Page, termo = 'QAAUTO'): Promise<LoteExclusaoQaauto> {
  exigirTermoQaauto(termo);
  return excluirRegistrosQaauto(page, 'Categoria', 1, (nome) => excluirCategoria(page, nome));
}
