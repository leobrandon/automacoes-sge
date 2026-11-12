import { expect, type Locator, type Page } from '@playwright/test';
import { isMarcaQAAuto } from '../factories/marca.factory';
import {
  confirmarExclusaoMarca,
  linhaMarca,
  pesquisarMarca,
} from '../helpers/navigation/marca.navigation';

export interface MarcaExcluida {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoMarca {
  totalExcluidos: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui somente a Marca QAAUTO de descrição exata, pela lixeira da linha na grade. */
export async function excluirMarca(page: Page, descricao: string): Promise<MarcaExcluida> {
  const alvo = descricao.trim();
  if (!isMarcaQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de uma Marca QAAUTO.');
  }

  await pesquisarMarca(page, alvo);
  const linha = linhaMarca(page, alvo);
  const encontrados = await linha.count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Marca "${alvo}" na consulta, encontrado ${encontrados}. `
      + 'Execute criar_marca_action antes, ajuste a descrição em dados_exclusao_marca.json '
      + 'ou remova a duplicidade manualmente.',
    );
  }

  const excluir = linha.locator('a[title="Excluir Marca"]');
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusaoMarca(page);

  const aviso = page.locator('.swal2-popup').filter({ hasText: 'Marca removida!' });
  await expect(aviso).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(page.locator('.swal2-container')).toHaveCount(0, { timeout: 15000 });

  await pesquisarMarca(page, alvo);
  await expect(linhaMarca(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Marca excluída e ausência conferida: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}

function celulasDescricao(page: Page): Locator {
  return page.locator('#main #grid table tbody tr td:first-child');
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e remove só descrições iniciadas por
 * QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirMarcasEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoMarca> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoMarca = {
    totalExcluidos: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarMarca(page, 'QAAUTO');
    const descricoes = (await celulasDescricao(page).allInnerTexts()).map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isMarcaQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirMarca(page, proxima);
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
