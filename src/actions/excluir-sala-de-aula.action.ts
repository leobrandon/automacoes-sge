import { expect, type Page } from '@playwright/test';
import { isSalaDeAulaQAAuto } from '../factories/sala-de-aula.factory';
import {
  abrirEdicaoSalaDeAula,
  confirmarExclusaoSalaDeAula,
  linhaSalaDeAula,
  pesquisarSalaDeAula,
  tituloConsultaSalaDeAula,
} from '../helpers/navigation/sala-de-aula.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface SalaDeAulaExcluida {
  descricao: string;
  escola: string;
  url: string;
}

export interface ResultadoLoteExclusaoSalaDeAula {
  totalExcluidas: number;
  excluidas: Array<{ descricao: string; escola: string }>;
  falhas: Array<{ descricao: string; escola: string; motivo: string }>;
}

/** Exclui somente a Sala de Aula QAAUTO de descrição exata na escola informada, abrindo-a pela grade. */
export async function excluirSalaDeAula(page: Page, descricao: string, escola: string): Promise<SalaDeAulaExcluida> {
  const alvo = descricao.trim();
  const escolaAlvo = escola.trim();
  if (!isSalaDeAulaQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de uma Sala de Aula QAAUTO.');
  }
  if (!escolaAlvo) throw new Error('Informe a escola da Sala de Aula a ser excluída.');

  await pesquisarSalaDeAula(page, alvo);
  const encontradas = await linhaSalaDeAula(page, alvo, escolaAlvo).count();
  if (encontradas !== 1) {
    throw new Error(
      `Esperada 1 Sala de Aula "${alvo}" na escola "${escolaAlvo}", encontrada(s) ${encontradas}. `
      + 'Execute criar_sala_de_aula_action antes ou ajuste dados_exclusao_sala_de_aula.json.',
    );
  }

  await abrirEdicaoSalaDeAula(page, alvo, escolaAlvo);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusaoSalaDeAula(page);

  await expect(page.getByText(/Sala exclu[ií]da com sucesso!/i)).toBeVisible({ timeout: 20000 });
  await expect(tituloConsultaSalaDeAula(page)).toBeVisible({ timeout: 20000 });
  await pesquisarSalaDeAula(page, alvo);
  await expect(linhaSalaDeAula(page, alvo, escolaAlvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Sala de Aula excluída e ausência conferida: ${alvo} | ${escolaAlvo}`);
  return { descricao: alvo, escola: escolaAlvo, url: page.url() };
}

/** Colunas da grade: [oculta, Descrição, ..., Escola "NOME - código"]; a Escola é a última. */
async function salasVisiveis(page: Page): Promise<Array<{ descricao: string; escola: string }>> {
  const itens = await page.locator('#main #grid table tbody tr').evaluateAll((linhas) => linhas.map((linha) => {
    const textos = Array.from((linha as HTMLTableRowElement).cells).map((celula) => celula.innerText.trim());
    return { descricao: textos[1] ?? '', escola: textos[textos.length - 1] ?? '' };
  }));
  return itens
    .map((item) => ({ ...item, escola: item.escola.replace(/\s*-\s*\d+$/, '') }))
    .filter((item) => item.descricao && item.escola);
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e remove só salas cuja descrição começa
 * com QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirSalasDeAulaEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoSalaDeAula> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoSalaDeAula = { totalExcluidas: 0, excluidas: [], falhas: [] };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarSalaDeAula(page, 'QAAUTO');
    const proxima = (await salasVisiveis(page)).find(
      (item) => isSalaDeAulaQAAuto(item.descricao) && !tentadas.has(`${item.descricao}|${item.escola}`),
    );
    if (!proxima) break;

    tentadas.add(`${proxima.descricao}|${proxima.escola}`);
    try {
      await excluirSalaDeAula(page, proxima.descricao, proxima.escola);
      resultado.excluidas.push(proxima);
    } catch (erro) {
      resultado.falhas.push({ ...proxima, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  resultado.totalExcluidas = resultado.excluidas.length;
  return resultado;
}
