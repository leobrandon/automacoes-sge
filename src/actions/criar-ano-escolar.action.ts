import { expect, type Page } from '@playwright/test';
import {
  buildAnoEscolar,
  type AnoEscolarData,
  type BuildAnoEscolarOptions,
} from '../factories/ano-escolar.factory';
import {
  aguardarCarregamentoAnoEscolar,
  linhaAnoEscolar,
  navegarParaAdicionarAnoEscolar,
  navegarParaConsultaAnoEscolar,
  pesquisarAnoEscolar,
} from '../helpers/navigation/ano-escolar.navigation';
import { waitForSgeLoaders } from '../helpers/navigation/common.navigation';
import { excluirAnoEscolar } from './excluir-ano-escolar.action';

export interface AnoEscolarCriado extends AnoEscolarData {
  url: string;
}

export interface OpcoesCriacaoAnoEscolar {
  /** Mantém o registro caso a confirmação ou validação após o salvamento falhe. */
  preservarRegistroEmFalha?: boolean;
}

async function selecionarOpcao(page: Page, campo: string, valor: string): Promise<void> {
  const select = page.locator(`#${campo}`);
  await expect(select).toBeEnabled({ timeout: 15000 });
  const gatilho = page.locator(`#s2id_${campo} > .select2-choice`);
  await gatilho.waitFor({ state: 'visible', timeout: 15000 });
  await gatilho.click();
  const buscaDropdown = page.locator('.select2-drop-active .select2-input:visible').first();
  if (await buscaDropdown.count()) await buscaDropdown.pressSequentially(valor);
  const opcao = page.getByRole('option', { name: valor, exact: true });
  await opcao.waitFor({ state: 'visible', timeout: 10000 });
  const carregamentoEtapas = campo === 'ComposicaoEnsinoId'
    ? page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR') === '/serie/obtenhalistadeetapaensino'
        && response.request().method() === 'GET';
    }, { timeout: 20000 })
    : undefined;
  await opcao.click();
  if (carregamentoEtapas) {
    const resposta = await carregamentoEtapas;
    if (!resposta.ok()) throw new Error(`O carregamento de Etapa de Ensino retornou HTTP ${resposta.status()}.`);
  }
  await aguardarCarregamentoAnoEscolar(page);
}

async function definirSwitch(page: Page, id: string, valor: 'Sim' | 'Não'): Promise<void> {
  const controle = page.locator(`#${id}`);
  const esperado = valor === 'Sim';
  await controle.waitFor({ state: 'attached', timeout: 10000 });
  if (await controle.isChecked() !== esperado) {
    const toggle = page.locator(`label:has(#${id}) .toggle`).first();
    await toggle.waitFor({ state: 'visible', timeout: 10000 });
    await toggle.click();
  }
  await expect(controle).toBeChecked({ checked: esperado });
}

async function selecionarTipoIdade(page: Page, valor: 'Meses' | 'Anos'): Promise<void> {
  const select = page.locator('#TipoIdade');
  await select.click();
  const opcao = page.getByRole('option', { name: valor, exact: true });
  await opcao.waitFor({ state: 'visible', timeout: 5000 });
  await opcao.click();
  await expect(select.locator('option:checked')).toHaveText(valor);
}

async function fecharFeedbackDeSalvamento(page: Page): Promise<string> {
  const alerta = page.locator('.swal2-popup:visible')
    .filter({ hasText: /salvo com sucesso|erro|falha|inválid|obrigatóri|duplicad|não foi possível/i })
    .first();
  await alerta.waitFor({ state: 'visible', timeout: 20000 });

  const texto = (await alerta.innerText().catch(() => '')).trim();
  const erro = /erro|falha|inválid|obrigatóri|duplicad|não foi possível/i.test(texto);
  const ok = alerta.locator('button:visible').filter({ hasText: /^(Ok|Fechar)$/i }).first();
  await ok.click();
  await alerta.waitFor({ state: 'hidden', timeout: 10000 });
  if (erro) throw new Error(`O SGE não confirmou o cadastro do Ano Escolar: ${texto}`);
  if (!/salvo com sucesso/i.test(texto)) {
    throw new Error(`O SGE apresentou uma confirmação inesperada para o cadastro: ${texto}`);
  }
  return texto;
}

/** Cadastra o Ano Escolar pela UI e confirma sua persistência na grade. */
export async function criarAnoEscolar(
  page: Page,
  options: BuildAnoEscolarOptions = {},
  sequencia = 1,
  opcoesExecucao: OpcoesCriacaoAnoEscolar = {},
): Promise<AnoEscolarCriado> {
  const dados = buildAnoEscolar(options, sequencia);
  console.log(`\n🚀 Ano Escolar a ser criado: "${dados.nome}"`);
  let salvamentoTentado = false;

  try {
    await navegarParaAdicionarAnoEscolar(page);
    const formulario = page.locator('#main');

    await formulario.locator('#Nome').fill(dados.nome);
    await definirSwitch(page, 'Ativo', dados.ativo);
    await definirSwitch(page, 'ConclusaoDeEtapa', dados.conclusaoEtapa);
    await definirSwitch(page, 'UtilizaImpressaoCertificado', dados.utilizaImpressaoCertificado);
    await formulario.locator('#CodigoParaGeracaoDaTurma').fill(dados.codigoTurma);
    if (dados.codigoExterno) await formulario.locator('#IdentificadorExterno').fill(dados.codigoExterno);
    if (dados.nomeCorrespondenteLei9394_96) {
      await formulario.locator('#NomeCorrespondenteLei9394_96').fill(dados.nomeCorrespondenteLei9394_96);
    }

    await selecionarOpcao(page, 'ComposicaoEnsinoId', dados.composicaoEnsino);
    await expect(page.locator('#EtapaEnsinoId')).toBeEnabled({ timeout: 15000 });
    await selecionarOpcao(page, 'EtapaEnsinoId', dados.etapaEnsino);

    if (dados.idadeMinima) await formulario.locator('#IdadeMinima').fill(dados.idadeMinima);
    if (dados.tipoIdade) await selecionarTipoIdade(page, dados.tipoIdade);
    if (dados.dataCompletaAte) {
      const data = formulario.locator('#SelecionarData');
      await data.fill(dados.dataCompletaAte);
      await data.press('Tab');
      await waitForSgeLoaders(page);
    }

    if (dados.tituloHistorico) {
      await formulario.locator('#TituloParaImpressaoNoHistoricoEscolar').fill(dados.tituloHistorico);
    }
    if (dados.equivalenciaHistorico) {
      await selecionarOpcao(page, 'EquivalenciaHistoricoEscolarSerieId', dados.equivalenciaHistorico);
    }

    salvamentoTentado = true;
    await formulario.locator('#btnSubmit:visible').click();
    await waitForSgeLoaders(page);
    const feedback = await fecharFeedbackDeSalvamento(page);

    await navegarParaConsultaAnoEscolar(page);
    await pesquisarAnoEscolar(page, dados.nome);
    const linha = linhaAnoEscolar(page, dados.nome);
    await linha.waitFor({ state: 'visible', timeout: 15000 });
    const quantidade = await linha.count();
    if (quantidade !== 1) {
      throw new Error(`Esperada uma linha para "${dados.nome}"; encontradas ${quantidade}.`);
    }
    if (feedback) console.log(`✅ Confirmação do SGE: ${feedback}`);
    return { ...dados, url: page.url() };
  } catch (erro) {
    if (!salvamentoTentado || opcoesExecucao.preservarRegistroEmFalha) throw erro;
    try {
      await navegarParaConsultaAnoEscolar(page);
      await pesquisarAnoEscolar(page, dados.nome);
      const linha = linhaAnoEscolar(page, dados.nome);
      const quantidade = await linha.count();
      if (quantidade > 1) {
        throw new Error(`A limpeza foi interrompida: encontrados ${quantidade} Anos Escolares com o nome "${dados.nome}".`);
      }
      if (quantidade === 1) await excluirAnoEscolar(page, dados.nome);
    } catch (erroLimpeza) {
      throw new AggregateError([erro, erroLimpeza], `Falha na validação e limpeza de ${dados.nome}.`);
    }
    throw erro;
  }
}
