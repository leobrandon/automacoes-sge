import { expect, type Page } from '@playwright/test';
import {
  buildComponente,
  type BuildComponenteOptions,
  type ComponenteData,
} from '../factories/componente.factory';
import {
  aguardarCarregamentoComponentes,
  linhaComponente,
  navegarParaAdicionarComponente,
  navegarParaConsultaComponentes,
  pesquisarComponente,
} from '../helpers/navigation/componente.navigation';
import { waitForSgeLoaders } from '../helpers/navigation/common.navigation';
import { excluirComponente } from './excluir-componente.action';

export interface ComponenteCriado extends ComponenteData {
  url: string;
}

async function selecionarOpcao(
  page: Page,
  campo: 'MateriaEscolar' | 'ComponenteCurricularId',
  valor: string,
): Promise<void> {
  const gatilho = page.locator(`#s2id_${campo} > .select2-choice`);
  await gatilho.waitFor({ state: 'visible', timeout: 15000 });
  await gatilho.click();
  const opcao = page.getByRole('option', { name: valor, exact: true });

  if (campo === 'MateriaEscolar') {
    const [resposta] = await Promise.all([
      page.waitForResponse((response) =>
        new URL(response.url()).pathname.toLowerCase() === '/disciplina/otenhacomponentescurriculares'
        && response.request().method() === 'GET',
      { timeout: 20000 }),
      opcao.click(),
    ]);
    if (!resposta.ok()) {
      throw new Error(`O carregamento dos Componentes do Educacenso retornou HTTP ${resposta.status()}.`);
    }
  } else {
    await opcao.waitFor({ state: 'visible', timeout: 10000 });
    await opcao.click();
  }
  await aguardarCarregamentoComponentes(page);
}

async function definirToggle(page: Page, id: string, ativo: boolean): Promise<void> {
  const controle = page.locator(`#${id}`);
  await controle.waitFor({ state: 'attached', timeout: 10000 });
  if (await controle.isChecked() === ativo) return;

  const pai = controle.locator('xpath=..');
  const classePai = await pai.getAttribute('class') || '';
  const toggle = classePai.split(/\s+/).includes('toggle')
    ? pai
    : page.locator(`label:has(#${id}) .toggle`);
  await toggle.waitFor({ state: 'visible', timeout: 10000 });
  await toggle.click();
  await expect(controle).toBeChecked({ checked: ativo });
}

async function fecharFeedbackSeExistir(page: Page): Promise<void> {
  const alerta = page.locator('.swal2-popup:visible').first();
  if (!await alerta.isVisible().catch(() => false)) return;

  const texto = (await alerta.innerText().catch(() => '')).trim();
  const ok = alerta.getByRole('button', { name: /^(Ok|OK)$/ }).first();
  if (await ok.isVisible().catch(() => false)) await ok.click();
  if (/erro|falha|inválid|obrigatóri/i.test(texto)) {
    throw new Error(`O SGE não confirmou a operação: ${texto}`);
  }
}

/** Cria um componente pela UI, confirma a linha exata e remove-o se a verificação falhar. */
export async function criarComponente(
  page: Page,
  options: BuildComponenteOptions = {},
  sequencia = 1,
): Promise<ComponenteCriado> {
  const dados = buildComponente(options, sequencia);
  console.log(`\n🚀 Componente a ser criado: "${dados.nome}"`);

  let salvamentoTentado = false;
  try {
    await navegarParaAdicionarComponente(page);
    const formulario = page.locator('#form_disciplina');
    await definirToggle(page, 'Ativo', true);
    await formulario.locator('#Nome').fill(dados.nome);
    await formulario.locator('#Abreviacao').fill(dados.abreviacao);
    await formulario.locator('#Codigo').fill(dados.codigo);

    await selecionarOpcao(page, 'MateriaEscolar', dados.tipo);
    await selecionarOpcao(page, 'ComponenteCurricularId', dados.componenteCurricularEducacenso);

    // Mantém desativadas opções que revelam dependências adicionais no formulário.
    for (const id of [
      'AtividadeComplementar',
      'Diversificada',
      'NaoReprova',
      'ItinerarioFormativo',
      'OfertaLivroDidatico',
      'UtilizaCor',
    ]) {
      await definirToggle(page, id, false);
    }

    salvamentoTentado = true;
    const [resposta] = await Promise.all([
      page.waitForResponse((response) =>
        new URL(response.url()).pathname.toLowerCase().startsWith('/disciplina')
        && response.request().method() === 'POST',
      { timeout: 30000 }),
      formulario.locator('#btn_salvar').click(),
    ]);
    if (!resposta.ok()) throw new Error(`O cadastro do Componente retornou HTTP ${resposta.status()}.`);
    await waitForSgeLoaders(page);
    await fecharFeedbackSeExistir(page);

    await navegarParaConsultaComponentes(page);
    await pesquisarComponente(page, dados.nome);
    const linha = linhaComponente(page, dados.nome);
    await linha.waitFor({ state: 'visible', timeout: 15000 });
    if (await linha.count() !== 1) {
      throw new Error(`Esperada uma linha para "${dados.nome}"; encontradas ${await linha.count()}.`);
    }
    return { ...dados, url: page.url() };
  } catch (error) {
    if (!salvamentoTentado) throw error;
    try {
      await pesquisarComponente(page, dados.nome);
      const linha = linhaComponente(page, dados.nome);
      const quantidade = await linha.count();
      if (quantidade > 1) {
        throw new Error(`A limpeza foi interrompida: encontrados ${quantidade} Componentes com o nome "${dados.nome}".`);
      }
      if (quantidade === 1) await excluirComponente(page, dados.nome);
    } catch (limpeza) {
      throw new AggregateError([error, limpeza], `Falha na validação e limpeza de ${dados.nome}.`);
    }
    throw error;
  }
}
