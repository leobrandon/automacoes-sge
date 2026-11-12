import { expect, type Page } from '@playwright/test';
import { isAtividadeFisicaQAAuto } from '../factories/atividade-fisica.factory';
import {
  confirmarExclusaoAtividadeFisica,
  linhaAtividadeFisica,
  pesquisarAtividadeFisica,
} from '../helpers/navigation/atividade-fisica.navigation';

export interface AtividadeFisicaExcluida {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoAtividadeFisica {
  totalExcluidas: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui uma linha QAAUTO exata pelo botão vermelho de lixeira da grade. */
export async function excluirAtividadeFisica(page: Page, descricao: string): Promise<AtividadeFisicaExcluida> {
  const alvo = descricao.trim();
  if (!isAtividadeFisicaQAAuto(alvo)) {
    throw new Error('A exclusão automatizada requer uma descrição iniciada por QAAUTO.');
  }

  await pesquisarAtividadeFisica(page, alvo);
  const linha = linhaAtividadeFisica(page, alvo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const lixeira = linha.getByTitle('Excluir');
  await expect(lixeira).toBeVisible();
  await lixeira.click();
  await confirmarExclusaoAtividadeFisica(page);

  await pesquisarAtividadeFisica(page, alvo);
  await expect(linha).toHaveCount(0, { timeout: 15000 });
  return { descricao: alvo, url: page.url() };
}

/** Percorre a grade filtrada por QAAUTO e remove apenas descrições iniciadas por QAAUTO. */
export async function excluirAtividadesFisicasEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoAtividadeFisica> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoAtividadeFisica = { totalExcluidas: 0, descricoesExcluidas: [], falhas: [] };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarAtividadeFisica(page, 'QAAUTO');
    const descricoes = (await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts())
      .map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isAtividadeFisicaQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirAtividadeFisica(page, proxima);
      resultado.descricoesExcluidas.push(proxima);
    } catch (erro) {
      resultado.falhas.push({ descricao: proxima, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  resultado.totalExcluidas = resultado.descricoesExcluidas.length;
  return resultado;
}
