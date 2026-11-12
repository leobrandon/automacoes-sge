import { expect, type Page } from '@playwright/test';
import {
  buildTipoOcorrenciaEscolar,
  type TipoOcorrenciaEscolarCriado,
  type TipoOcorrenciaEscolarData,
  type TipoOcorrenciaEscolarParametrizacao,
} from '../factories/tipo-ocorrencia-escolar.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  aguardarCarregamentoTipoOcorrenciaEscolar,
  navegarParaConsultaTipoOcorrenciaEscolar,
  pesquisarTipoOcorrenciaEscolar,
  linhaTipoOcorrenciaEscolar,
} from '../helpers/navigation/tipo-ocorrencia-escolar.navigation';

const CAMPOS_PARAMETRIZACAO = [
  ['naturezaOcorrencia', 'InformarNatureza'],
  ['dataOcorrencia', 'InformarData'],
  ['turnoOcorrencia', 'InformarTurno'],
  ['horaOcorrencia', 'InformarHora'],
  ['descricaoOcorrencia', 'InformarDescricao'],
  ['procedimentoAdotado', 'InformarProcedimentoAdotado'],
  ['informarEnvolvidos', 'InformarEnvolvidos'],
] as const satisfies ReadonlyArray<readonly [keyof TipoOcorrenciaEscolarParametrizacao, string]>;

const CAMPOS_ENVOLVIDOS = [
  ['aluno', 'PermiteInformarEnvolvidoDoTipoAluno'],
  ['responsavelDoAluno', 'PermiteInformarEnvolvidoDoTipoResponsavel'],
  // A tela chama Servidor ao tipo Colaborador da entidade.
  ['servidor', 'PermiteInformarEnvolvidoDoTipoColaborador'],
  ['outro', 'PermiteInformarEnvolvidoDoTipoOutro'],
] as const satisfies ReadonlyArray<readonly [keyof TipoOcorrenciaEscolarData['dadosEnvolvidos'], string]>;

async function selecionarOpcaoVisivel(page: Page, id: string, valor: string): Promise<void> {
  const seletor = page.locator(`#main #s2id_${id}`);
  const escolhido = seletor.locator('.select2-chosen');
  await expect(seletor).toBeVisible();

  if ((await escolhido.innerText()).trim() !== valor) {
    await seletor.locator('a.select2-choice').click();
    const lista = page.locator('.select2-drop:visible');
    await expect(lista).toHaveCount(1);
    const opcao = lista.getByRole('option', { name: valor, exact: true });
    await expect(opcao).toHaveCount(1);
    await expect(opcao).toBeVisible();
    await opcao.click();
  }

  await expect(escolhido).toHaveText(valor);
}

async function definirAlternancia(page: Page, id: string, valor: 'Sim' | 'Não'): Promise<void> {
  const controle = page.locator(`#main #${id}`);
  const alternancia = page.locator(`#main label:has(#${id}) .toggle`);
  const esperado = valor === 'Sim';
  await expect(alternancia).toBeVisible();
  if (await controle.isChecked() !== esperado) await alternancia.click();
  await expect(controle).toBeChecked({ checked: esperado });
}

async function configurarEnvolvidos(page: Page, dados: TipoOcorrenciaEscolarData): Promise<void> {
  const aba = getByRoleSge(page.locator('#main'), 'link', {
    name: 'Dados dos envolvidos',
    exact: true,
  });
  await expect(aba).toBeVisible({ timeout: 15000 });
  await aba.click();
  await expect(page.locator('#main #s4:visible')).toBeVisible({ timeout: 15000 });

  for (const [campo, id] of CAMPOS_ENVOLVIDOS) {
    await definirAlternancia(page, id, dados.dadosEnvolvidos[campo]);
  }
}

async function conferirEnvolvidos(page: Page, dados: TipoOcorrenciaEscolarData): Promise<void> {
  const conteudo = page.locator('#main');
  const aba = getByRoleSge(conteudo, 'link', {
    name: 'Dados dos envolvidos',
    exact: true,
  });
  await expect(aba).toBeVisible({ timeout: 15000 });
  await aba.click();
  await expect(conteudo.locator('#s4:visible')).toBeVisible({ timeout: 15000 });

  for (const [campo, id] of CAMPOS_ENVOLVIDOS) {
    await expect(conteudo.locator(`#${id}`))
      .toBeChecked({ checked: dados.dadosEnvolvidos[campo] === 'Sim' });
  }
}

async function confirmarSucesso(page: Page, acao: string): Promise<void> {
  const alerta = page.locator('.swal2-popup:visible');
  await expect(alerta).toContainText(/sucesso|salv[ao]|cadastrad[ao]/i, { timeout: 20000 });
  const mensagem = (await alerta.innerText()).trim();
  if (!/(sucesso|salv[ao]|cadastrad[ao])/i.test(mensagem) || /(erro|falha|inválid)/i.test(mensagem)) {
    throw new Error(`O SGE não confirmou ${acao}: ${mensagem}`);
  }

  const confirmar = alerta.getByRole('button', { name: /^(Ok|OK|Fechar)$/i });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
  await expect(alerta).toBeHidden({ timeout: 15000 });
}

async function conferirPersistencia(page: Page, dados: TipoOcorrenciaEscolarData, descricao: string): Promise<void> {
  const conteudo = page.locator('#main');
  const abaParametrizacao = getByRoleSge(conteudo, 'link', { name: 'Parametrização', exact: true });
  await expect(abaParametrizacao).toBeVisible();
  await abaParametrizacao.click();
  await expect(conteudo.locator('#s1:visible')).toBeVisible();
  await expect(conteudo.locator('#Descricao')).toHaveValue(descricao);
  await expect(conteudo.locator('#Ativo')).toBeChecked({ checked: dados.ativo === 'Sim' });

  for (const [campo, id] of CAMPOS_PARAMETRIZACAO) {
    await expect(conteudo.locator(`#s2id_${id} .select2-chosen`))
      .toHaveText(dados.parametrizacao[campo]);
  }

  await conferirEnvolvidos(page, dados);
}

/** Cria o tipo e confere a configuração na edição aberta pelo salvamento. */
export async function criarTipoOcorrenciaEscolar(
  page: Page,
  dados: TipoOcorrenciaEscolarData,
  sequencia = 1,
): Promise<TipoOcorrenciaEscolarCriado> {
  const registro = buildTipoOcorrenciaEscolar(dados, sequencia);
  await navegarParaConsultaTipoOcorrenciaEscolar(page);

  const conteudo = page.locator('#main');
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await expect(getByRoleSge(conteudo, 'heading', { name: /Adicionar Tipo de Ocorrência Escolar/i }))
    .toBeVisible({ timeout: 15000 });

  await conteudo.locator('#Descricao').fill(registro.descricao);
  await definirAlternancia(page, 'Ativo', dados.ativo);
  for (const [campo, id] of CAMPOS_PARAMETRIZACAO) {
    await selecionarOpcaoVisivel(page, id, dados.parametrizacao[campo]);
  }
  await configurarEnvolvidos(page, dados);

  const salvar = getByRoleSge(conteudo, 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();
  await salvar.click();
  await confirmarSucesso(page, `a criação de "${registro.descricao}"`);

  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar Tipo de Ocorrência Escolar/i }))
    .toBeVisible({ timeout: 20000 });
  await aguardarCarregamentoTipoOcorrenciaEscolar(page);
  await conferirPersistencia(page, dados, registro.descricao);
  await getByRoleSge(conteudo, 'button', { name: /Voltar/i }).click();
  await expect(getByRoleSge(conteudo, 'heading', { name: /Consulta de Tipo de Ocorrência Escolar/i }))
    .toBeVisible({ timeout: 20000 });
  await pesquisarTipoOcorrenciaEscolar(page, registro.descricao);
  const linha = linhaTipoOcorrenciaEscolar(page, registro.descricao);
  await expect.poll(() => linha.count(), { timeout: 15000 }).toBeGreaterThan(0);
  console.log(`[QAAUTO] Tipo salvo e configurações persistidas conferidas: ${registro.descricao}`);

  return { ...registro, url: page.url() };
}
