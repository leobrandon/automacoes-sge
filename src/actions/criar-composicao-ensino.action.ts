import { expect, type Page } from '@playwright/test';
import {
  buildComposicaoEnsino,
  type BuildComposicaoEnsinoOptions,
  type ComposicaoEnsinoData,
} from '../factories/composicao-ensino.factory';
import {
  aguardarCarregamentoComposicaoEnsino,
  linhaComposicaoEnsino,
  navegarParaAdicionarComposicaoEnsino,
  navegarParaConsultaComposicaoEnsino,
  pesquisarComposicaoEnsino,
} from '../helpers/navigation/composicao-ensino.navigation';

export interface ComposicaoEnsinoCriada extends ComposicaoEnsinoData {
  url: string;
}

async function selecionarOpcao(page: Page, campo: string, valor: string): Promise<void> {
  await expect(page.locator(`#${campo}`)).toBeEnabled({ timeout: 15000 });
  const gatilho = page.locator(`#s2id_${campo} > .select2-choice`);
  await gatilho.waitFor({ state: 'visible', timeout: 15000 });
  await gatilho.click();
  const opcao = page.getByRole('option', { name: valor, exact: true });
  await opcao.waitFor({ state: 'visible', timeout: 10000 });
  if (campo === 'NivelModalidadeEnsino') {
    const [resposta] = await Promise.all([
      page.waitForResponse((response) =>
        new URL(response.url()).pathname.toLowerCase() === '/composicaoensino/obtenhamodalidades'
        && response.request().method() === 'GET',
      { timeout: 15000 }),
      opcao.click(),
    ]);
    if (!resposta.ok()) {
      throw new Error(`O carregamento das modalidades retornou HTTP ${resposta.status()}.`);
    }
    await expect(page.locator('#Modalidade')).toBeEnabled({ timeout: 15000 });
  } else {
    await opcao.click();
  }
  await aguardarCarregamentoComposicaoEnsino(page);
}

async function definirSwitch(page: Page, id: string, valor: 'Sim' | 'Não'): Promise<void> {
  const controle = page.locator(`#${id}`);
  const esperado = valor === 'Sim';
  if (await controle.isChecked() !== esperado) {
    // O input é ocultado pelo componente visual; a interação ocorre no toggle visível.
    await page.locator(`label:has(#${id}) .toggle`).click();
  }
  if (await controle.isChecked() !== esperado) {
    throw new Error(`Não foi possível definir o campo ${id} como "${valor}".`);
  }
}

/** Cadastra uma composição pela interface do SGE e confirma que ela aparece na grade. */
export async function criarComposicaoEnsino(
  page: Page,
  options: BuildComposicaoEnsinoOptions = {},
  sequencia = 1,
): Promise<ComposicaoEnsinoCriada> {
  const dados = buildComposicaoEnsino(options, sequencia);

  console.log(`\n🚀 Composição de Ensino a ser criada: "${dados.descricao}"`);
  await navegarParaAdicionarComposicaoEnsino(page);
  const formulario = page.locator('#main');

  await formulario.locator('#Descricao').fill(dados.descricao);
  await formulario.locator('#Abreviacao').fill(dados.abreviacao);
  await formulario.locator('#CodigoParaGeracaoDaTurma').fill(dados.codigoTurma);
  await formulario.locator('#DescricaoHistorico').fill(dados.descricaoHistorico);
  await formulario.locator('#IdentificadorExterno').fill(dados.codigoExterno);

  await selecionarOpcao(page, 'NivelModalidadeEnsino', dados.nivelEnsino);
  await selecionarOpcao(page, 'Modalidade', dados.modalidadeEnsino);

  const secaoFase = formulario.locator('#sectionFaseEnsino');
  if (dados.faseEnsino && await secaoFase.isVisible().catch(() => false)) {
    await selecionarOpcao(page, 'Fase', dados.faseEnsino);
  } else if (dados.faseEnsino) {
    throw new Error(`A interface não exibiu Fase de Ensino para o nível "${dados.nivelEnsino}".`);
  }

  await definirSwitch(page, 'Ativo', dados.ativo);
  await definirSwitch(page, 'ValidaHorarioConteudoAplicado', dados.validarHorarioConteudoAplicado);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === '/composicaoensino/posteditar' && response.request().method() === 'POST';
    }, { timeout: 20000 }),
    formulario.getByRole('button', { name: /Salvar/i, includeHidden: true }).click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`O cadastro de Composição de Ensino retornou HTTP ${resposta.status()}.`);
  }
  // O salvamento retorna à consulta; esta tela não abre um popup de sucesso.
  await formulario.getByRole('heading', {
    name: /Consulta de Composição de Ensino/i,
    includeHidden: true,
  }).waitFor({ state: 'visible', timeout: 20000 });
  await navegarParaConsultaComposicaoEnsino(page);
  await pesquisarComposicaoEnsino(page, dados.descricao);
  const linha = linhaComposicaoEnsino(page, dados.descricao);
  await linha.waitFor({ state: 'visible', timeout: 15000 });
  if (await linha.count() !== 1) {
    throw new Error(`Esperada uma linha para "${dados.descricao}"; encontradas ${await linha.count()}.`);
  }
  return { ...dados, url: page.url() };
}
