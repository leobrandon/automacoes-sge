import { expect, type Page } from '@playwright/test';
import {
  buildPermissaoPonto,
  type BuildPermissaoPontoOptions,
  type PermissaoPontoData,
} from '../factories/permissao-ponto.factory';
import {
  abrirEdicaoPermissaoPonto,
  abrirModalAdicionarPermissaoPonto,
  confirmarAvisoSucessoPermissaoPonto,
  definirParametroPermissaoPonto,
  fecharModalPermissaoPonto,
  linhaPermissaoPonto,
  modalPermissaoPonto,
  pesquisarPermissaoPonto,
  proximaSequenciaLivrePermissaoPonto,
  type ParametroPermissaoPonto,
} from '../helpers/navigation/permissao-ponto.navigation';

export interface PermissaoPontoCriada extends PermissaoPontoData {
  url: string;
}

/** Parâmetro do modal, campo da factory e cabeçalho da coluna correspondente na grade. */
export const PARAMETROS_PERMISSAO_PONTO: ReadonlyArray<{
  id: ParametroPermissaoPonto;
  campo: keyof PermissaoPontoData;
  coluna: RegExp;
}> = [
  { id: 'AcessoPreFolha', campo: 'acessoPreFolha', coluna: /^Acesso a pré-folha\?$/ },
  { id: 'InserirJustificativaPreFolha', campo: 'inserirJustificativaPreFolha', coluna: /^Inserir justificativa na pré-folha\?$/ },
  { id: 'RegistrarPontoViaAplicativo', campo: 'registrarPontoViaAplicativo', coluna: /^Registrar ponto via aplicativo\?$/ },
  { id: 'PermitirRegistrarForaDoRaio', campo: 'permitirRegistrarForaDoRaio', coluna: /^Permitir registrar fora do raio\?$/ },
  { id: 'PermitirRegistroManual', campo: 'permitirRegistroManual', coluna: /^Permite registro manual\?$/ },
];

/** Cria uma Permissão pela interface e prova a persistência na grade e reabrindo o registro. */
export async function criarPermissaoPonto(
  page: Page,
  options: BuildPermissaoPontoOptions = {},
  sequencia = 1,
): Promise<PermissaoPontoCriada> {
  // Permissões não podem ser excluídas: usa sempre uma descrição ainda inexistente.
  const sequenciaLivre = await proximaSequenciaLivrePermissaoPonto(page, options, sequencia);
  const dados = buildPermissaoPonto(options, sequenciaLivre);
  await abrirModalAdicionarPermissaoPonto(page);

  const modal = modalPermissaoPonto(page);
  await modal.locator('#Descricao').fill(dados.descricao);
  // Pais primeiro: os parâmetros dependentes só habilitam depois deles.
  for (const { id, campo } of PARAMETROS_PERMISSAO_PONTO) {
    await definirParametroPermissaoPonto(page, id, dados[campo] as boolean);
  }

  const salvar = modal.locator('#btnSalvar');
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByText('Permissão adicionada com sucesso.', { exact: true });
  const atencao = page.getByText(/^Atenção/);
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible()) {
    throw new Error(`O SGE não aceitou a Permissão "${dados.descricao}" (aviso "Atenção").`);
  }
  await confirmarAvisoSucessoPermissaoPonto(page, 'Permissão adicionada com sucesso.');
  await expect(modal).toBeHidden({ timeout: 15000 });

  await pesquisarPermissaoPonto(page, dados.descricao);
  const linha = linhaPermissaoPonto(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha.locator('i[title="Ativo"]')).toHaveCount(1);

  // Reabre para conferir cada parâmetro gravado.
  await abrirEdicaoPermissaoPonto(page, dados.descricao);
  await expect(modal.locator('#Ativo')).toBeChecked();
  for (const { id, campo } of PARAMETROS_PERMISSAO_PONTO) {
    await expect(modal.locator(`#${id}`), `parâmetro ${id} não foi persistido`)
      .toBeChecked({ checked: dados[campo] as boolean });
  }
  await fecharModalPermissaoPonto(page);

  console.log(`[QAAUTO] Permissão criada e conferida: ${dados.descricao}`);
  return { ...dados, url: page.url() };
}
