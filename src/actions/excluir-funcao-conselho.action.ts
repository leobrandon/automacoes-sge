import { expect, type Page } from '@playwright/test';
import { isFuncaoConselhoQAAuto } from '../factories/funcao-conselho.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { confirmarPerguntaConselho, fecharAvisoConselho } from '../helpers/navigation/conselho-escolar.navigation';
import { linhaFuncaoConselho, pesquisarFuncaoConselho } from '../helpers/navigation/funcao-conselho.navigation';

export interface FuncaoConselhoExcluida {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoFuncaoConselho {
  totalExcluidas: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui uma função QAAUTO exata pela lixeira da grade e prova que ela saiu. */
export async function excluirFuncaoConselho(page: Page, descricao: string): Promise<FuncaoConselhoExcluida> {
  const alvo = descricao.trim();
  if (!isFuncaoConselhoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada requer uma descrição iniciada por QAAUTO.');
  }

  await pesquisarFuncaoConselho(page, alvo);
  const linha = linhaFuncaoConselho(page, alvo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByTitle('Remover', { exact: true }).click();
  await confirmarPerguntaConselho(page, /Tem certeza que deseja excluir essa função do conselho escolar/i);
  await fecharAvisoConselho(page, /A função do conselho escolar foi removida/i);

  await pesquisarFuncaoConselho(page, alvo);
  await expect(linha).toHaveCount(0, { timeout: 15000 });
  return { descricao: alvo, url: page.url() };
}

/** Percorre a grade pela interface e remove apenas descrições iniciadas por QAAUTO. */
export async function excluirFuncoesConselhoEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoFuncaoConselho> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoFuncaoConselho = { totalExcluidas: 0, descricoesExcluidas: [], falhas: [] };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarFuncaoConselho(page, 'QAAUTO');
    const linhas = page.locator('#main table tbody tr:visible').filter({ has: page.getByTitle('Remover', { exact: true }) });

    let proxima: string | undefined;
    for (let indice = 0; indice < await linhas.count(); indice++) {
      const descricao = (await getByRoleSge(linhas.nth(indice), 'cell').first().innerText()).trim();
      if (isFuncaoConselhoQAAuto(descricao) && !tentadas.has(descricao)) {
        proxima = descricao;
        break;
      }
    }
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirFuncaoConselho(page, proxima);
      resultado.descricoesExcluidas.push(proxima);
    } catch (erro) {
      resultado.falhas.push({ descricao: proxima, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  resultado.totalExcluidas = resultado.descricoesExcluidas.length;
  return resultado;
}
