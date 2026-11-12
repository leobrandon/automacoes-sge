import { expect, type Locator, type Page } from '@playwright/test';
import { isMotivoMovimentacaoQAAuto } from '../factories/motivo-movimentacao.factory';
import {
  abrirEdicaoMotivoMovimentacao,
  confirmarExclusaoMotivoMovimentacao,
  linhaMotivoMovimentacao,
  pesquisarMotivoMovimentacao,
  tituloConsultaMotivoMovimentacao,
} from '../helpers/navigation/motivo-movimentacao.navigation';

export interface MotivoMovimentacaoExcluido {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoMotivoMovimentacao {
  totalExcluidos: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui somente o Motivo QAAUTO de descrição exata, abrindo-o pela grade e usando "Excluir". */
export async function excluirMotivoMovimentacao(
  page: Page,
  descricao: string,
): Promise<MotivoMovimentacaoExcluido> {
  const alvo = descricao.trim();
  if (!isMotivoMovimentacaoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de um Motivo de Movimentação QAAUTO.');
  }

  await pesquisarMotivoMovimentacao(page, alvo);
  const encontrados = await linhaMotivoMovimentacao(page, alvo).count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Motivo de Movimentação "${alvo}" na consulta, encontrado ${encontrados}. `
      + 'Execute criar_motivo_movimentacao_action antes, ajuste a descrição em '
      + 'dados_exclusao_motivo_movimentacao.json ou remova a duplicidade manualmente.',
    );
  }

  await abrirEdicaoMotivoMovimentacao(page, alvo);
  const excluir = page.locator('#main #btn_excluir');
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusaoMotivoMovimentacao(page);

  await expect(page.getByText('O motivo foi excluído com sucesso.')).toBeVisible({ timeout: 20000 });
  await expect(tituloConsultaMotivoMovimentacao(page)).toBeVisible({ timeout: 20000 });
  await pesquisarMotivoMovimentacao(page, alvo);
  await expect(linhaMotivoMovimentacao(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Motivo de Movimentação excluído e ausência conferida: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}

function celulasDescricao(page: Page): Locator {
  return page.locator('#main #grid table tbody tr td:nth-child(2)');
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e remove só descrições iniciadas por
 * QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirMotivosMovimentacaoEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoMotivoMovimentacao> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoMotivoMovimentacao = {
    totalExcluidos: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarMotivoMovimentacao(page, 'QAAUTO');
    const descricoes = (await celulasDescricao(page).allInnerTexts()).map((texto) => texto.trim());
    const proxima = descricoes.find(
      (descricao) => isMotivoMovimentacaoQAAuto(descricao) && !tentadas.has(descricao),
    );
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirMotivoMovimentacao(page, proxima);
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
