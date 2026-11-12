import { expect, type Page } from '@playwright/test';
import { isMedicamentoQAAuto } from '../factories/medicamento.factory';
import {
  confirmarExclusaoMedicamento,
  linhaMedicamento,
  pesquisarMedicamento,
} from '../helpers/navigation/medicamento.navigation';

export interface MedicamentoExcluido {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoMedicamento {
  totalExcluidos: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui uma linha QAAUTO exata pelo botão vermelho de lixeira da grade. */
export async function excluirMedicamento(page: Page, descricao: string): Promise<MedicamentoExcluido> {
  const alvo = descricao.trim();
  if (!isMedicamentoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada requer uma descrição iniciada por QAAUTO.');
  }

  await pesquisarMedicamento(page, alvo);
  const linha = linhaMedicamento(page, alvo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const lixeira = linha.getByTitle('Excluir');
  await expect(lixeira).toBeVisible();
  await lixeira.click();
  await confirmarExclusaoMedicamento(page);

  await pesquisarMedicamento(page, alvo);
  await expect(linha).toHaveCount(0, { timeout: 15000 });
  return { descricao: alvo, url: page.url() };
}

/** Percorre a grade filtrada por QAAUTO e remove apenas descrições iniciadas por QAAUTO. */
export async function excluirMedicamentosEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoMedicamento> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoMedicamento = { totalExcluidos: 0, descricoesExcluidas: [], falhas: [] };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarMedicamento(page, 'QAAUTO');
    const descricoes = (await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts())
      .map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isMedicamentoQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirMedicamento(page, proxima);
      resultado.descricoesExcluidas.push(proxima);
    } catch (erro) {
      resultado.falhas.push({ descricao: proxima, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  resultado.totalExcluidos = resultado.descricoesExcluidas.length;
  return resultado;
}
