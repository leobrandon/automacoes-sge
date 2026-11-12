import { expect, type Page } from '@playwright/test';
import { isDoencaQAAuto } from '../factories/doenca.factory';
import {
  confirmarExclusaoDoenca,
  linhaDoenca,
  pesquisarDoenca,
} from '../helpers/navigation/doenca.navigation';

export interface DoencaExcluida {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoDoenca {
  totalExcluidas: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui uma linha QAAUTO exata pelo botão vermelho de lixeira da grade. */
export async function excluirDoenca(page: Page, descricao: string): Promise<DoencaExcluida> {
  const alvo = descricao.trim();
  if (!isDoencaQAAuto(alvo)) {
    throw new Error('A exclusão automatizada requer uma descrição iniciada por QAAUTO.');
  }

  await pesquisarDoenca(page, alvo);
  const linha = linhaDoenca(page, alvo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const lixeira = linha.getByTitle('Excluir');
  await expect(lixeira).toBeVisible();
  await lixeira.click();
  await confirmarExclusaoDoenca(page);

  await pesquisarDoenca(page, alvo);
  await expect(linha).toHaveCount(0, { timeout: 15000 });
  return { descricao: alvo, url: page.url() };
}

/** Percorre a grade filtrada por QAAUTO e remove apenas descrições iniciadas por QAAUTO. */
export async function excluirDoencasEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoDoenca> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoDoenca = { totalExcluidas: 0, descricoesExcluidas: [], falhas: [] };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarDoenca(page, 'QAAUTO');
    const descricoes = (await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts())
      .map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isDoencaQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirDoenca(page, proxima);
      resultado.descricoesExcluidas.push(proxima);
    } catch (erro) {
      resultado.falhas.push({ descricao: proxima, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  resultado.totalExcluidas = resultado.descricoesExcluidas.length;
  return resultado;
}
