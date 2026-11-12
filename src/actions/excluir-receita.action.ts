import {expect, type Page} from '@playwright/test';
import {isCentroCustosQAAuto} from '../factories/centro-custos.factory';
import {
  abrirRegistroCentroCustos,
  descricoesQAAutoCentroCustos,
  fecharAvisoCentroCustos,
  linhasCentroCustos,
  pesquisarCentroCustos,
  tituloConsultaCentroCustos,
} from '../helpers/navigation/centro-custos.navigation';
import type {ResultadoLoteExclusaoCentroCustos} from './excluir-custo.action';

/** Exclui o único Lançamento de Receita QAAUTO com a descrição exata e confirma a ausência na grade. */
export async function excluirReceita(page: Page, descricao: string): Promise<void> {
  const alvo = descricao.trim();
  if (!isCentroCustosQAAuto(alvo)) throw new Error('A exclusão automatizada exige a descrição exata de um Lançamento de Receita QAAUTO.');
  await abrirRegistroCentroCustos(page, 'receita', alvo);
  await page.locator('#main #btn_excluir').click();
  const sim = page.locator('.swal2-popup').getByRole('button', {name: 'Sim', exact: true});
  await expect(sim).toBeVisible();
  await sim.click();
  // O aviso de sucesso pode demorar alguns segundos; a consulta só fica utilizável depois de fechá-lo.
  await fecharAvisoCentroCustos(page, 'Receita excluída.');
  await expect(tituloConsultaCentroCustos(page, 'receita')).toBeVisible();
  await pesquisarCentroCustos(page, 'receita', alvo);
  await expect(linhasCentroCustos(page, 'receita', alvo)).toHaveCount(0);
  console.log(`[QAAUTO] Lançamento de Receita excluído e ausência conferida: ${alvo}`);
}

/** Exclui, um a um, os Lançamentos de Receita cuja descrição começa com QAAUTO. Itens que falham não são repetidos. */
export async function excluirReceitasQAAutoEmLote(page: Page): Promise<ResultadoLoteExclusaoCentroCustos> {
  const resultado: ResultadoLoteExclusaoCentroCustos = {excluidos: [], falhas: []};
  const tentadas = new Set<string>();
  while (true) {
    await pesquisarCentroCustos(page, 'receita', 'QAAUTO');
    const proxima = (await descricoesQAAutoCentroCustos(page, 'receita')).find(d => !tentadas.has(d));
    if (!proxima) break;
    tentadas.add(proxima);
    try {
      await excluirReceita(page, proxima);
      resultado.excluidos.push(proxima);
    } catch (e) {
      resultado.falhas.push({descricao: proxima, motivo: e instanceof Error ? e.message : String(e)});
    }
  }
  return resultado;
}
