import { expect, type Locator, type Page } from '@playwright/test';
import { isJustificativaPontoQAAuto } from '../factories/justificativa-ponto.factory';
import {
  abrirEdicaoJustificativaPonto,
  confirmarExclusaoJustificativaPonto,
  linhaJustificativaPonto,
  pesquisarJustificativaPonto,
  tituloConsultaJustificativaPonto,
} from '../helpers/navigation/justificativa-ponto.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface JustificativaPontoExcluida {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoJustificativaPonto {
  totalExcluidas: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui somente a Justificativa QAAUTO de descrição exata, abrindo-a pela grade e usando "Excluir". */
export async function excluirJustificativaPonto(page: Page, descricao: string): Promise<JustificativaPontoExcluida> {
  const alvo = descricao.trim();
  if (!isJustificativaPontoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de uma Justificativa de Ponto QAAUTO.');
  }

  await pesquisarJustificativaPonto(page, alvo);
  const encontradas = await linhaJustificativaPonto(page, alvo).count();
  if (encontradas !== 1) {
    throw new Error(
      `Esperada 1 Justificativa de Ponto "${alvo}" na consulta, encontrada ${encontradas}. `
      + 'Execute criar_justificativa_ponto_action antes, ajuste a descrição em dados_exclusao_justificativa_ponto.json '
      + 'ou remova a duplicidade manualmente (o SGE aceita descrições repetidas).',
    );
  }

  await abrirEdicaoJustificativaPonto(page, alvo);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusaoJustificativaPonto(page);

  await expect(page.getByText('Justificativa excluída com sucesso!', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(tituloConsultaJustificativaPonto(page)).toBeVisible({ timeout: 20000 });
  await pesquisarJustificativaPonto(page, alvo);
  await expect(linhaJustificativaPonto(page, alvo)).toHaveCount(0, { timeout: 15000 });

  return { descricao: alvo, url: page.url() };
}

function celulasDescricao(page: Page): Locator {
  return page.locator('#main #grid table tbody tr td:nth-child(2)');
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e remove só descrições iniciadas por
 * QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirJustificativasPontoEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoJustificativaPonto> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoJustificativaPonto = {
    totalExcluidas: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarJustificativaPonto(page, 'QAAUTO');
    const descricoes = (await celulasDescricao(page).allInnerTexts()).map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isJustificativaPontoQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirJustificativaPonto(page, proxima);
      resultado.descricoesExcluidas.push(proxima);
    } catch (erro) {
      resultado.falhas.push({
        descricao: proxima,
        motivo: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  resultado.totalExcluidas = resultado.descricoesExcluidas.length;
  return resultado;
}
