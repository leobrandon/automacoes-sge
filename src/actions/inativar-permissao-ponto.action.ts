import { expect, type Locator, type Page } from '@playwright/test';
import { isPermissaoPontoQAAuto } from '../factories/permissao-ponto.factory';
import {
  abrirEdicaoPermissaoPonto,
  confirmarAvisoSucessoPermissaoPonto,
  definirParametroPermissaoPonto,
  linhaPermissaoPonto,
  modalPermissaoPonto,
  pesquisarPermissaoPonto,
} from '../helpers/navigation/permissao-ponto.navigation';

export interface PermissaoPontoInativada {
  descricao: string;
  /** `true` quando a Permissão já estava inativa e nada foi alterado. */
  jaEstavaInativa: boolean;
  url: string;
}

export interface ResultadoLoteInativacaoPermissaoPonto {
  totalInativadas: number;
  descricoesInativadas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/**
 * Inativa (não há exclusão) somente a Permissão QAAUTO de descrição exata, pelo parâmetro "Ativo"
 * do modal de edição, e prova o resultado na grade.
 */
export async function inativarPermissaoPonto(page: Page, descricao: string): Promise<PermissaoPontoInativada> {
  const alvo = descricao.trim();
  if (!isPermissaoPontoQAAuto(alvo)) {
    throw new Error('A inativação automatizada exige a descrição exata de uma Permissão QAAUTO.');
  }

  await pesquisarPermissaoPonto(page, alvo);
  const encontradas = await linhaPermissaoPonto(page, alvo).count();
  if (encontradas !== 1) {
    throw new Error(
      `Esperada 1 Permissão "${alvo}" na consulta, encontrada ${encontradas}. `
      + 'Execute criar_permissao_ponto_action antes ou ajuste a descrição em dados_inativacao_permissao_ponto.json.',
    );
  }

  const linha = linhaPermissaoPonto(page, alvo);
  if (await linha.locator('i[title="Inativo"]').count() === 1) {
    return { descricao: alvo, jaEstavaInativa: true, url: page.url() };
  }

  await abrirEdicaoPermissaoPonto(page, alvo);
  const modal = modalPermissaoPonto(page);
  await definirParametroPermissaoPonto(page, 'Ativo', false);
  await modal.locator('#btnSalvar').click();

  await confirmarAvisoSucessoPermissaoPonto(page, 'Permissão alterada com sucesso.');
  await expect(modal).toBeHidden({ timeout: 15000 });

  await pesquisarPermissaoPonto(page, alvo);
  await expect(linhaPermissaoPonto(page, alvo).locator('i[title="Inativo"]')).toHaveCount(1, { timeout: 15000 });

  console.log(`[QAAUTO] Permissão inativada e conferida na grade: ${alvo}`);
  return { descricao: alvo, jaEstavaInativa: false, url: page.url() };
}

function linhasAtivas(page: Page): Locator {
  return page.locator('#main #grid table tbody tr').filter({ has: page.locator('i[title="Ativo"]') });
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e inativa só descrições iniciadas por
 * QAAUTO que ainda estejam ativas. Itens que falharem não são reprocessados.
 */
export async function inativarPermissoesPontoEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteInativacaoPermissaoPonto> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A inativação em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteInativacaoPermissaoPonto = {
    totalInativadas: 0,
    descricoesInativadas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarPermissaoPonto(page, 'QAAUTO');
    const descricoes = (await linhasAtivas(page).locator('td:nth-child(2)').allInnerTexts()).map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isPermissaoPontoQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await inativarPermissaoPonto(page, proxima);
      resultado.descricoesInativadas.push(proxima);
    } catch (erro) {
      resultado.falhas.push({
        descricao: proxima,
        motivo: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  resultado.totalInativadas = resultado.descricoesInativadas.length;
  return resultado;
}
