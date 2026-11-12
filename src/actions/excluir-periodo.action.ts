import { expect, type Locator, type Page } from '@playwright/test';
import { isPeriodoQAAuto } from '../factories/periodo.factory';
import {
  abrirEdicaoPeriodo,
  confirmarExclusaoPeriodo,
  linhaPeriodo,
  pesquisarPeriodo,
  tituloConsultaPeriodo,
} from '../helpers/navigation/periodo.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface PeriodoExcluido {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoPeriodo {
  totalExcluidos: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui somente o Período QAAUTO de descrição exata, abrindo-o pela grade e usando "Excluir". */
export async function excluirPeriodo(page: Page, descricao: string): Promise<PeriodoExcluido> {
  const alvo = descricao.trim();
  if (!isPeriodoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de um Período QAAUTO.');
  }

  await pesquisarPeriodo(page, alvo);
  const encontrados = await linhaPeriodo(page, alvo).count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Período "${alvo}" na consulta, encontrado ${encontrados}. `
      + 'Execute criar_periodo_action antes, ajuste a descrição em dados_exclusao_periodo.json '
      + 'ou remova a duplicidade manualmente.',
    );
  }

  await abrirEdicaoPeriodo(page, alvo);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusaoPeriodo(page);

  await expect(page.getByText('Período excluído com sucesso!', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(tituloConsultaPeriodo(page)).toBeVisible({ timeout: 20000 });
  await pesquisarPeriodo(page, alvo);
  await expect(linhaPeriodo(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Período excluído e ausência conferida: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}

function celulasDescricao(page: Page): Locator {
  return page.locator('#main #grid table tbody tr td:nth-child(2)');
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e remove só descrições iniciadas por
 * QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirPeriodosEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoPeriodo> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoPeriodo = {
    totalExcluidos: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarPeriodo(page, 'QAAUTO');
    const descricoes = (await celulasDescricao(page).allInnerTexts()).map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isPeriodoQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirPeriodo(page, proxima);
      resultado.descricoesExcluidas.push(proxima);
    } catch (erro) {
      resultado.falhas.push({
        descricao: proxima,
        motivo: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  resultado.totalExcluidos = resultado.descricoesExcluidas.length;
  return resultado;
}
