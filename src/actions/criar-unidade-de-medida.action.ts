import { expect, type Page } from '@playwright/test';
import {
  buildUnidadeDeMedida,
  type BuildUnidadeDeMedidaOptions,
  type UnidadeDeMedidaData,
} from '../factories/unidade-de-medida.factory';
import {
  concluirAlertaSge,
  fecharModalSge,
  linhaPorDescricao,
  modalSge,
  navegarParaItemConfiguracao,
  pesquisarItemConfiguracao,
  selecionarOpcaoSelect2,
} from '../helpers/navigation/itens-configuracao.navigation';

export interface UnidadeDeMedidaCriada extends UnidadeDeMedidaData {
  url: string;
}

/** Configurações > Definições Iniciais > Itens > Unidades de Medida: cria e confirma na grade. */
export async function criarUnidadeDeMedida(
  page: Page,
  options: BuildUnidadeDeMedidaOptions = {},
  sequencia = 1,
): Promise<UnidadeDeMedidaCriada> {
  const dados = buildUnidadeDeMedida(options, sequencia);
  console.log(`\n🚀 Unidade de Medida a ser criada: "${dados.descricao}" (${dados.abreviacao})`);

  await navegarParaItemConfiguracao(page, 'Unidades de Medida');
  await page.locator('#main').getByRole('button', { name: /Adicionar/ }).click();
  const modal = modalSge(page, '#formEditarUnidadeDeMedida');
  await expect(modal.locator('#Descricao')).toBeVisible();

  if (dados.tipo) {
    await selecionarOpcaoSelect2(page, {
      id: 'Tipo',
      opcao: dados.tipo,
      rotulo: 'Tipo',
      dicaListaVazia: 'O campo Tipo deveria listar Comprimento, Peso, Volume, Tempo e Unidade.',
    });
  }
  await modal.locator('#Descricao').fill(dados.descricao);
  await modal.locator('#Abreviacao').fill(dados.abreviacao);
  await modal.locator('#btnSalvar').click();
  await concluirAlertaSge(page, `Criação da Unidade de Medida "${dados.descricao}" não confirmada`);
  await fecharModalSge(modal);

  await pesquisarItemConfiguracao(page, 'Unidades de Medida', dados.descricao);
  await expect(linhaPorDescricao(page, dados.descricao)).toHaveCount(1);
  console.log(`✅ Unidade de Medida criada: "${dados.descricao}"`);
  return { ...dados, url: page.url() };
}
