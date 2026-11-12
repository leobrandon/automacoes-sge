import { expect, type Locator, type Page } from '@playwright/test';
import { isDepreciacaoPatrimonioQAAuto } from '../factories/depreciacao-patrimonio.factory';
import {
  abrirEdicaoDepreciacaoPatrimonio,
  confirmarExclusaoDepreciacaoPatrimonio,
  linhaDepreciacaoPatrimonio,
  pesquisarDepreciacaoPatrimonio,
  tituloConsultaDepreciacaoPatrimonio,
} from '../helpers/navigation/depreciacao-patrimonio.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface DepreciacaoPatrimonioExcluida {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoDepreciacaoPatrimonio {
  totalExcluidos: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui somente a Depreciação QAAUTO de descrição exata, abrindo-a pela grade e usando "Excluir". */
export async function excluirDepreciacaoPatrimonio(
  page: Page,
  descricao: string,
): Promise<DepreciacaoPatrimonioExcluida> {
  const alvo = descricao.trim();
  if (!isDepreciacaoPatrimonioQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de uma Depreciação QAAUTO.');
  }

  await pesquisarDepreciacaoPatrimonio(page, alvo);
  const encontrados = await linhaDepreciacaoPatrimonio(page, alvo).count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperada 1 Depreciação "${alvo}" na consulta, encontradas ${encontrados}. `
      + 'Execute criar_depreciacao_patrimonio_action antes, ajuste a descrição em '
      + 'dados_exclusao_depreciacao_patrimonio.json ou remova a duplicidade manualmente.',
    );
  }

  await abrirEdicaoDepreciacaoPatrimonio(page, alvo);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusaoDepreciacaoPatrimonio(page);

  const sucesso = page.getByText('Depreciação excluida com sucesso!', { exact: true });
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  await expect(sucesso).toBeHidden({ timeout: 20000 });
  await expect(tituloConsultaDepreciacaoPatrimonio(page)).toBeVisible({ timeout: 20000 });
  await pesquisarDepreciacaoPatrimonio(page, alvo);
  await expect(linhaDepreciacaoPatrimonio(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Depreciação excluída e ausência conferida: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}

function celulasDescricao(page: Page): Locator {
  return page.locator('#main #grid table tbody tr td:nth-child(3)');
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e remove só descrições iniciadas por
 * QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirDepreciacoesPatrimonioEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoDepreciacaoPatrimonio> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoDepreciacaoPatrimonio = {
    totalExcluidos: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarDepreciacaoPatrimonio(page, 'QAAUTO');
    const descricoes = (await celulasDescricao(page).allInnerTexts()).map((texto) => texto.trim());
    const proxima = descricoes.find((item) => isDepreciacaoPatrimonioQAAuto(item) && !tentadas.has(item));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirDepreciacaoPatrimonio(page, proxima);
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
