import { expect, type Page } from '@playwright/test';
import {
  buildTipoDeCategoria,
  type BuildTipoDeCategoriaOptions,
  type TipoDeCategoriaData,
} from '../factories/tipo-de-categoria.factory';
import {
  concluirAlertaSge,
  fecharModalSge,
  linhaPorDescricao,
  modalSge,
  navegarParaItemConfiguracao,
  pesquisarItemConfiguracao,
} from '../helpers/navigation/itens-configuracao.navigation';

export interface TipoDeCategoriaCriado extends TipoDeCategoriaData {
  url: string;
}

/** Configurações > Definições Iniciais > Itens > Tipo de Categoria: cria e confirma na grade. */
export async function criarTipoDeCategoria(
  page: Page,
  options: BuildTipoDeCategoriaOptions = {},
  sequencia = 1,
): Promise<TipoDeCategoriaCriado> {
  const dados = buildTipoDeCategoria(options, sequencia);
  console.log(`\n🚀 Tipo de Categoria a ser criado: "${dados.descricao}"`);

  await navegarParaItemConfiguracao(page, 'Tipo de Categoria');
  await page.locator('#main').getByRole('button', { name: /Adicionar/ }).click();
  const modal = modalSge(page, '#formTipoCategoriaGeral');
  await expect(modal.locator('#Descricao')).toBeVisible();

  await modal.locator('#Descricao').fill(dados.descricao);
  await modal.locator('#btnSalvarTipoCategoria').click();
  await concluirAlertaSge(page, `Criação do Tipo de Categoria "${dados.descricao}" não confirmada`);
  // Após salvar, o SGE mantém o modal aberto (passa a editar o registro criado).
  await fecharModalSge(modal);

  await pesquisarItemConfiguracao(page, 'Tipo de Categoria', dados.descricao);
  await expect(linhaPorDescricao(page, dados.descricao)).toHaveCount(1);
  console.log(`✅ Tipo de Categoria criado: "${dados.descricao}"`);
  return { ...dados, url: page.url() };
}
