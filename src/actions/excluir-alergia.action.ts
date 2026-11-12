import { expect, type Page } from '@playwright/test';
import { isAlergiaQAAuto } from '../factories/alergia.factory';
import {
  confirmarExclusaoAlergia,
  linhaAlergia,
  pesquisarAlergia,
} from '../helpers/navigation/alergia.navigation';

export interface AlergiaExcluida {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoAlergia {
  totalExcluidas: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui uma linha QAAUTO exata pelo botão vermelho de lixeira da grade. */
export async function excluirAlergia(page: Page, descricao: string): Promise<AlergiaExcluida> {
  const alvo = descricao.trim();
  if (!isAlergiaQAAuto(alvo)) {
    throw new Error('A exclusão automatizada requer uma descrição iniciada por QAAUTO.');
  }

  await pesquisarAlergia(page, alvo);
  const linha = linhaAlergia(page, alvo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const lixeira = linha.getByTitle('Excluir');
  await expect(lixeira).toBeVisible();
  await lixeira.click();
  await confirmarExclusaoAlergia(page);

  await pesquisarAlergia(page, alvo);
  await expect(linha).toHaveCount(0, { timeout: 15000 });
  return { descricao: alvo, url: page.url() };
}

/** Percorre a grade filtrada por QAAUTO e remove apenas descrições iniciadas por QAAUTO. */
export async function excluirAlergiasEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoAlergia> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoAlergia = { totalExcluidas: 0, descricoesExcluidas: [], falhas: [] };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarAlergia(page, 'QAAUTO');
    const descricoes = (await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts())
      .map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isAlergiaQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirAlergia(page, proxima);
      resultado.descricoesExcluidas.push(proxima);
    } catch (erro) {
      resultado.falhas.push({ descricao: proxima, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  resultado.totalExcluidas = resultado.descricoesExcluidas.length;
  return resultado;
}
