import { expect, type Page } from '@playwright/test';
import { isRestricaoAlimentarQAAuto } from '../factories/restricao-alimentar.factory';
import {
  confirmarExclusaoRestricaoAlimentar,
  linhaRestricaoAlimentar,
  pesquisarRestricaoAlimentar,
} from '../helpers/navigation/restricao-alimentar.navigation';

export interface RestricaoAlimentarExcluida {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoRestricaoAlimentar {
  totalExcluidas: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui uma linha QAAUTO exata pelo botão vermelho de lixeira da grade. */
export async function excluirRestricaoAlimentar(
  page: Page,
  descricao: string,
): Promise<RestricaoAlimentarExcluida> {
  const alvo = descricao.trim();
  if (!isRestricaoAlimentarQAAuto(alvo)) {
    throw new Error('A exclusão automatizada requer uma descrição iniciada por QAAUTO.');
  }

  await pesquisarRestricaoAlimentar(page, alvo);
  const linha = linhaRestricaoAlimentar(page, alvo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const lixeira = linha.getByTitle('Excluir');
  await expect(lixeira).toBeVisible();
  await lixeira.click();
  await confirmarExclusaoRestricaoAlimentar(page);

  await pesquisarRestricaoAlimentar(page, alvo);
  await expect(linha).toHaveCount(0, { timeout: 15000 });
  return { descricao: alvo, url: page.url() };
}

/** Percorre a grade filtrada por QAAUTO e remove apenas descrições iniciadas por QAAUTO. */
export async function excluirRestricoesAlimentaresEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoRestricaoAlimentar> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoRestricaoAlimentar = {
    totalExcluidas: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarRestricaoAlimentar(page, 'QAAUTO');
    const descricoes = (await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts())
      .map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isRestricaoAlimentarQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirRestricaoAlimentar(page, proxima);
      resultado.descricoesExcluidas.push(proxima);
    } catch (erro) {
      resultado.falhas.push({ descricao: proxima, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  resultado.totalExcluidas = resultado.descricoesExcluidas.length;
  return resultado;
}
