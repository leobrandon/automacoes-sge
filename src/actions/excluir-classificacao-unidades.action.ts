import { expect, type Locator, type Page } from '@playwright/test';
import { isClassificacaoUnidadesQAAuto } from '../factories/classificacao-unidades.factory';
import {
  confirmarAvisoClassificacaoUnidades,
  confirmarExclusaoClassificacaoUnidades,
  linhaClassificacaoUnidades,
  pesquisarClassificacaoUnidades,
} from '../helpers/navigation/classificacao-unidades.navigation';

export interface ClassificacaoUnidadesExcluida {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoClassificacaoUnidades {
  totalExcluidos: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/**
 * Exclui somente a Classificação QAAUTO de descrição exata, pela lixeira da linha. As classificações
 * reais do tenant (CEI, CMEI, CRECHE, ESCOLA, ESPECIAL…) nunca são aceitas como alvo.
 */
export async function excluirClassificacaoUnidades(
  page: Page,
  descricao: string,
): Promise<ClassificacaoUnidadesExcluida> {
  const alvo = descricao.trim();
  if (!isClassificacaoUnidadesQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de uma Classificação QAAUTO.');
  }

  await pesquisarClassificacaoUnidades(page, alvo);
  const linha = linhaClassificacaoUnidades(page, alvo);
  const encontrados = await linha.count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Classificação "${alvo}" na consulta, encontrado ${encontrados}. `
      + 'Execute criar_classificacao_unidades_action antes, ajuste a descrição em '
      + 'dados_exclusao_classificacao_unidades.json ou remova a duplicidade manualmente.',
    );
  }

  // O botão só tem ícone: o atributo title é o contrato estável.
  const excluir = linha.locator('a[title="Excluir"]');
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusaoClassificacaoUnidades(page);

  await expect(page.locator('.swal2-popup').filter({ hasText: 'Classificação excluída.' }))
    .toBeVisible({ timeout: 20000 });
  await confirmarAvisoClassificacaoUnidades(page);

  await pesquisarClassificacaoUnidades(page, alvo);
  await expect(linhaClassificacaoUnidades(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Classificação de Unidades excluída e ausência conferida: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}

function celulasDescricao(page: Page): Locator {
  return page.locator('#main #grid table tbody tr td:first-child');
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e remove só descrições iniciadas por
 * QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirClassificacoesUnidadesEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoClassificacaoUnidades> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoClassificacaoUnidades = {
    totalExcluidos: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarClassificacaoUnidades(page, 'QAAUTO');
    const descricoes = (await celulasDescricao(page).allInnerTexts()).map((texto) => texto.trim());
    const proxima = descricoes.find(
      (descricao) => isClassificacaoUnidadesQAAuto(descricao) && !tentadas.has(descricao),
    );
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirClassificacaoUnidades(page, proxima);
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
