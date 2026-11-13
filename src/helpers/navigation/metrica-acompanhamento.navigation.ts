import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildMetricaAcompanhamento,
  rotuloFaixaMetrica,
  type BuildMetricaAcompanhamentoOptions,
} from '../../factories/metrica-acompanhamento.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Métricas de acompanhamento/i;
const ROTA = '/metricadeacompanhamento';
const LIMITE_BUSCA_SEQUENCIA = 49;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaMetricaAcompanhamento(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

/** Modal "Adicionar/Editar métrica" (fica dentro de `#main`). */
export function modalMetricaAcompanhamento(page: Page): Locator {
  return main(page).locator('#modalMetricaDeAcompanhamento');
}

/**
 * Navega pelo menu visível Acompanhamento/Pautas > Métricas. A consulta não tem pesquisa: a grade vem
 * inteira do servidor, então `recarregar` repete o clique no menu para provar o que está persistido.
 */
export async function navegarParaConsultaMetricaAcompanhamento(
  page: Page,
  recarregar = false,
): Promise<void> {
  const titulo = tituloConsultaMetricaAcompanhamento(page);
  const adicionar = main(page).locator('#adicionarMetricaDeAcompanhamento');

  if (!recarregar && await titulo.isVisible()) {
    await adicionar.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const modulo = nav.getByRole('link', { name: /Acompanhamento\/Pautas/ });
  const destino = nav.getByRole('link', { name: 'Métricas', exact: true });

  await expect(modulo).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible()) await modulo.click();
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Métricas retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await adicionar.waitFor({ state: 'visible', timeout: 20000 });
}

/** Abre o modal de cadastro pelo botão "Adicionar métrica". */
export async function abrirModalAdicionarMetricaAcompanhamento(page: Page): Promise<Locator> {
  await navegarParaConsultaMetricaAcompanhamento(page);
  const adicionar = main(page).locator('#adicionarMetricaDeAcompanhamento');
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  const modal = modalMetricaAcompanhamento(page);
  await expect(modal).toBeVisible({ timeout: 15000 });
  await expect(modal.locator('#Nome')).toBeVisible({ timeout: 15000 });
  return modal;
}

/** Linha da grade com a classificação e o texto da faixa exatos, como a grade os mostra ("0 a 10"). */
export function linhaMetricaPorFaixaTexto(page: Page, classificacao: string, faixaTexto: string): Locator {
  return main(page)
    .locator('table tbody tr')
    .filter({ has: getByRoleSge(page, 'cell', { name: classificacao, exact: true }) })
    .filter({ has: getByRoleSge(page, 'cell', { name: faixaTexto, exact: true }) });
}

/** Linha da grade com a classificação e a faixa exatas (a faixa não se repete: o SGE recusa sobreposição). */
export function linhaMetricaAcompanhamento(
  page: Page,
  classificacao: string,
  minima: number,
  maxima: number,
): Locator {
  return linhaMetricaPorFaixaTexto(page, classificacao, rotuloFaixaMetrica(minima, maxima));
}

/** Classificação e faixa (textos da grade) de cada métrica cadastrada; ignora a linha "Nenhuma métrica cadastrada.". */
export async function metricasCadastradas(page: Page): Promise<Array<{ faixa: string; classificacao: string }>> {
  await expect(main(page).locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  const linhas = await main(page).locator('table tbody tr').evaluateAll((trs) => trs.map((tr) => {
    const celulas = [...tr.querySelectorAll('td')].map((td) => (td.textContent ?? '').replace(/\s+/g, ' ').trim());
    return { faixa: celulas[0] ?? '', classificacao: celulas[1] ?? '' };
  }));
  return linhas.filter((l) => / a /.test(l.faixa) && l.classificacao);
}

/** Faixas "N a M" já cadastradas na grade (ignora a linha "Nenhuma métrica cadastrada."). */
async function faixasCadastradas(page: Page): Promise<Array<[number, number]>> {
  const textos = await main(page).locator('table tbody tr td:first-child').allInnerTexts();
  const faixas: Array<[number, number]> = [];
  for (const texto of textos) {
    const partes = /^\s*(\d+(?:,\d+)?) a (\d+(?:,\d+)?)\s*$/.exec(texto);
    if (partes) faixas.push([Number(partes[1].replace(',', '.')), Number(partes[2].replace(',', '.'))]);
  }
  return faixas;
}

/**
 * Menor sequência >= `inicio` cuja faixa não encosta em nenhuma faixa já cadastrada. A faixa é a chave
 * única do SGE ("Faixa de métrica sobreposta"), então ela, e não o nome, define a próxima sequência.
 */
export async function proximaSequenciaLivreMetricaAcompanhamento(
  page: Page,
  options: BuildMetricaAcompanhamentoOptions,
  inicio = 1,
): Promise<number> {
  await navegarParaConsultaMetricaAcompanhamento(page, true);
  await expect(main(page).locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });
  const existentes = await faixasCadastradas(page);

  for (let sequencia = inicio; sequencia <= LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { pontuacaoMinima: minima, pontuacaoMaxima: maxima } = buildMetricaAcompanhamento(options, sequencia);
    if (!existentes.some(([min, max]) => minima <= max && maxima >= min)) return sequencia;
    // Faixa informada no JSON não muda com a sequência: tentar outra seria repetir a mesma colisão.
    if (options.pontuacaoMinima !== undefined) {
      throw new Error(
        `A faixa ${rotuloFaixaMetrica(minima, maxima)} colide com uma Métrica já cadastrada `
        + `(faixas existentes: ${existentes.map(([a, b]) => rotuloFaixaMetrica(a, b)).join(' | ') || 'nenhuma'}). `
        + 'Ajuste pontuacaoMinima/pontuacaoMaxima em dados_metrica_acompanhamento.json ou exclua a Métrica QAAUTO anterior.',
      );
    }
  }
  throw new Error(
    `Nenhuma faixa livre nas sequências ${inicio} a ${LIMITE_BUSCA_SEQUENCIA}. `
    + 'Exclua as Métricas QAAUTO criadas por execuções anteriores.',
  );
}

/** Aviso do SGE (SweetAlert) com botão `Ok` ou `Sim`; o `Ok` fecha o diálogo antes de seguir. */
export async function confirmarAvisoMetricaAcompanhamento(page: Page, nomeBotao: 'Sim' | 'Ok'): Promise<void> {
  const dialogo = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: nomeBotao, exact: true }) });
  await expect(dialogo).toBeVisible({ timeout: 15000 });
  await dialogo.getByRole('button', { name: nomeBotao, exact: true }).click();
  if (nomeBotao === 'Ok') await expect(dialogo).toBeHidden({ timeout: 15000 });
}
