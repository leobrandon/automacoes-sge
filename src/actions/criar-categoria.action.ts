import { expect, type Page } from '@playwright/test';
import { buildCategoria, type BuildCategoriaOptions, type CategoriaData } from '../factories/categoria.factory';
import {
  concluirAlertaSge,
  fecharModalSge,
  linhaPorDescricao,
  modalSge,
  navegarParaItemConfiguracao,
  pesquisarItemConfiguracao,
  selecionarOpcaoSelect2,
} from '../helpers/navigation/itens-configuracao.navigation';

export interface CategoriaCriada extends CategoriaData {
  /** Tipo de categoria efetivamente escolhido no campo. */
  tipoEscolhido: string;
  url: string;
}

/**
 * Cria uma Categoria e, na tela de edição que o SGE abre ao salvar, uma Subcategoria.
 * O Tipo de Categoria é dado de apoio do tenant.
 */
export async function criarCategoria(
  page: Page,
  options: BuildCategoriaOptions = {},
  sequencia = 1,
): Promise<CategoriaCriada> {
  const dados = buildCategoria(options, sequencia);
  console.log(`\n🚀 Categoria a ser criada: "${dados.nome}" com subcategoria "${dados.subcategoria}"`);

  await navegarParaItemConfiguracao(page, 'Categoria');
  await page.locator('#main').getByRole('button', { name: /Adicionar/ }).click();
  const formulario = page.locator('#formCategoriaGeral');
  await expect(formulario.locator('#Nome')).toBeVisible();

  await formulario.locator('#Nome').fill(dados.nome);
  const tipoEscolhido = await selecionarOpcaoSelect2(page, {
    id: 'TipoCategoriaGeralId',
    opcao: dados.tipoDeCategoria,
    rotulo: 'Tipo de Categoria',
    dicaListaVazia: 'Nenhum Tipo de Categoria cadastrado. Execute criar_tipo_de_categoria_action antes de criar a categoria.',
  });
  await page.locator('#btnSalvarCategoria').click();
  await concluirAlertaSge(page, `Criação da Categoria "${dados.nome}" não confirmada`);
  await expect(page.locator('#main h4').filter({ hasText: 'Editar Categoria' })).toBeVisible();

  // Subcategoria: botão Adicionar da seção "Subcategorias" na edição da categoria.
  await page.locator('#main').getByRole('button', { name: /Adicionar/ }).click();
  const modal = modalSge(page, '#formSubCategoriaGeral');
  await expect(modal.locator('#Descricao')).toBeVisible();
  await modal.locator('#Descricao').fill(dados.subcategoria);
  await modal.locator('#btnSalvarSubCategoria').click();
  await concluirAlertaSge(page, `Criação da Subcategoria "${dados.subcategoria}" não confirmada`);
  await fecharModalSge(modal);
  await expect(linhaPorDescricao(page, dados.subcategoria)).toHaveCount(1);

  await page.locator('#main').getByRole('button', { name: 'Voltar' }).click();
  await pesquisarItemConfiguracao(page, 'Categoria', dados.nome);
  await expect(linhaPorDescricao(page, dados.nome)).toHaveCount(1);
  console.log(`✅ Categoria criada: "${dados.nome}" (tipo "${tipoEscolhido}") com subcategoria "${dados.subcategoria}"`);
  return { ...dados, tipoEscolhido, url: page.url() };
}
