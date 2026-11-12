import { expect, type Page } from '@playwright/test';
import {
  buildGrupoDeUnidadeDeMedida,
  type BuildGrupoDeUnidadeDeMedidaOptions,
  type GrupoDeUnidadeDeMedidaData,
} from '../factories/grupo-de-unidade-de-medida.factory';
import {
  concluirAlertaSge,
  fecharModalSge,
  linhaPorDescricao,
  modalSge,
  navegarParaItemConfiguracao,
  pesquisarItemConfiguracao,
  selecionarOpcaoSelect2,
} from '../helpers/navigation/itens-configuracao.navigation';

export interface GrupoDeUnidadeDeMedidaCriado extends GrupoDeUnidadeDeMedidaData {
  /** Unidade de medida efetivamente escolhida no campo. */
  unidadeEscolhida: string;
  url: string;
}

/**
 * Cria um Grupo de Unidade de Medida. A unidade de medida é dado de apoio do tenant:
 * se não houver nenhuma, a action falha explicando qual automação rodar antes.
 */
export async function criarGrupoDeUnidadeDeMedida(
  page: Page,
  options: BuildGrupoDeUnidadeDeMedidaOptions = {},
  sequencia = 1,
): Promise<GrupoDeUnidadeDeMedidaCriado> {
  const dados = buildGrupoDeUnidadeDeMedida(options, sequencia);
  console.log(`\n🚀 Grupo de Unidade de Medida a ser criado: "${dados.descricao}"`);

  await navegarParaItemConfiguracao(page, 'Grupos de Unidade de Medida');
  await page.locator('#main').getByRole('button', { name: /Adicionar/ }).click();
  const modal = modalSge(page, '#formEditarGrupoUnidadeDeMedida');
  await expect(modal.locator('#Descricao')).toBeVisible();

  await modal.locator('#Descricao').fill(dados.descricao);
  const unidadeEscolhida = await selecionarOpcaoSelect2(page, {
    id: 'UnidadeDeMedidaId',
    opcao: dados.unidadeDeMedida,
    rotulo: 'Unidade de medida para conversão',
    dicaListaVazia: 'Nenhuma Unidade de Medida cadastrada. Execute criar_unidade_de_medida_action antes de criar o grupo.',
  });
  // Defeito conhecido do SGE (homologação): o POST grava (success:true), mas o GET /grupounidadedemedida/Editar/<id>
  // seguinte responde HTTP 500, então a tela não exibe alerta de sucesso e mantém o modal aberto.
  // O sucesso é provado pela resposta do POST e pela persistência na grade; erros de negócio (ex.: nome duplicado)
  // continuam vindo no alerta "Atenção" do SGE.
  const [resposta] = await Promise.all([
    page.waitForResponse(
      (r) => /\/GrupoUnidadeDeMedida\/PostGrupoUnidadeDeMedida\/?$/i.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
      { timeout: 30000 },
    ),
    modal.locator('#btnSalvar').click(),
  ]);
  const retorno = (await resposta.json()) as { success?: boolean; sucesso?: boolean; id?: number };
  if (!resposta.ok() || !(retorno.success ?? retorno.sucesso)) {
    await concluirAlertaSge(page, `Criação do Grupo de Unidade de Medida "${dados.descricao}" não confirmada`);
    throw new Error(`Criação do Grupo de Unidade de Medida "${dados.descricao}" não confirmada: ${JSON.stringify(retorno)}`);
  }
  await fecharModalSge(modal);

  await pesquisarItemConfiguracao(page, 'Grupos de Unidade de Medida', dados.descricao);
  await expect(linhaPorDescricao(page, dados.descricao)).toHaveCount(1);
  console.log(`✅ Grupo de Unidade de Medida criado: "${dados.descricao}"`);
  return { ...dados, unidadeEscolhida, url: page.url() };
}
