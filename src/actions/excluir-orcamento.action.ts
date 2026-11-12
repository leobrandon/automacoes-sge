import {expect, type Page} from '@playwright/test';
import {isCentroCustosQAAuto} from '../factories/centro-custos.factory';
import {
  abrirRegistroCentroCustos,
  descricoesQAAutoCentroCustos,
  excluirRegistroAbertoCentroCustos,
  linhasCentroCustos,
  pesquisarCentroCustos,
  tituloConsultaCentroCustos,
} from '../helpers/navigation/centro-custos.navigation';
import type {ResultadoLoteExclusaoCentroCustos} from './excluir-custo.action';

/** Exclui o único Orçamento QAAUTO com a descrição exata e confirma a ausência na grade. */
export async function excluirOrcamento(page: Page, descricao: string): Promise<void> {
  const alvo = descricao.trim();
  if (!isCentroCustosQAAuto(alvo)) throw new Error('A exclusão automatizada exige a descrição exata de um Orçamento QAAUTO.');
  await abrirRegistroCentroCustos(page, 'orcamento', alvo);
  await excluirRegistroAbertoCentroCustos(page, 'orcamento');
  // Diferente do custo, o SGE não exibe aviso de sucesso: volta direto para a consulta.
  await expect(tituloConsultaCentroCustos(page, 'orcamento')).toBeVisible({timeout: 30000});
  await expect(page.locator('.swal2-container')).toHaveCount(0);
  await pesquisarCentroCustos(page, 'orcamento', alvo);
  await expect(linhasCentroCustos(page, 'orcamento', alvo)).toHaveCount(0);
  console.log(`[QAAUTO] Orçamento excluído e ausência conferida: ${alvo}`);
}

/** Exclui, um a um, os Orçamentos cuja descrição começa com QAAUTO. Itens que falham não são repetidos. */
export async function excluirOrcamentosQAAutoEmLote(page: Page): Promise<ResultadoLoteExclusaoCentroCustos> {
  const resultado: ResultadoLoteExclusaoCentroCustos = {excluidos: [], falhas: []};
  const tentadas = new Set<string>();
  while (true) {
    await pesquisarCentroCustos(page, 'orcamento', 'QAAUTO');
    const proxima = (await descricoesQAAutoCentroCustos(page, 'orcamento')).find(d => !tentadas.has(d));
    if (!proxima) break;
    tentadas.add(proxima);
    try {
      await excluirOrcamento(page, proxima);
      resultado.excluidos.push(proxima);
    } catch (e) {
      resultado.falhas.push({descricao: proxima, motivo: e instanceof Error ? e.message : String(e)});
    }
  }
  return resultado;
}
