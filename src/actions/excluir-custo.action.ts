import {expect, type Page} from '@playwright/test';
import {isCentroCustosQAAuto} from '../factories/centro-custos.factory';
import {
  abrirRegistroCentroCustos,
  descricoesQAAutoCentroCustos,
  excluirRegistroAbertoCentroCustos,
  fecharAvisoCentroCustos,
  linhasCentroCustos,
  pesquisarCentroCustos,
  tituloConsultaCentroCustos,
} from '../helpers/navigation/centro-custos.navigation';

export interface ResultadoLoteExclusaoCentroCustos {
  excluidos: string[];
  falhas: Array<{descricao: string; motivo: string}>;
}

/** Exclui o único Lançamento de Custo QAAUTO com a descrição exata e confirma a ausência na grade. */
export async function excluirCusto(page: Page, descricao: string): Promise<void> {
  const alvo = descricao.trim();
  if (!isCentroCustosQAAuto(alvo)) throw new Error('A exclusão automatizada exige a descrição exata de um Lançamento de Custo QAAUTO.');
  await abrirRegistroCentroCustos(page, 'custo', alvo);
  await excluirRegistroAbertoCentroCustos(page, 'custo');
  await fecharAvisoCentroCustos(page, 'Custo excluído.');
  await expect(tituloConsultaCentroCustos(page, 'custo')).toBeVisible();
  await pesquisarCentroCustos(page, 'custo', alvo);
  await expect(linhasCentroCustos(page, 'custo', alvo)).toHaveCount(0);
  console.log(`[QAAUTO] Lançamento de Custo excluído e ausência conferida: ${alvo}`);
}

/** Exclui, um a um, os Lançamentos de Custo cuja descrição começa com QAAUTO. Itens que falham não são repetidos. */
export async function excluirCustosQAAutoEmLote(page: Page): Promise<ResultadoLoteExclusaoCentroCustos> {
  const resultado: ResultadoLoteExclusaoCentroCustos = {excluidos: [], falhas: []};
  const tentadas = new Set<string>();
  while (true) {
    await pesquisarCentroCustos(page, 'custo', 'QAAUTO');
    const proxima = (await descricoesQAAutoCentroCustos(page, 'custo')).find(d => !tentadas.has(d));
    if (!proxima) break;
    tentadas.add(proxima);
    try {
      await excluirCusto(page, proxima);
      resultado.excluidos.push(proxima);
    } catch (e) {
      resultado.falhas.push({descricao: proxima, motivo: e instanceof Error ? e.message : String(e)});
    }
  }
  return resultado;
}
