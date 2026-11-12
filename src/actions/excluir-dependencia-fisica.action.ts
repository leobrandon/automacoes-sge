import { expect, type Locator, type Page } from '@playwright/test';
import { isDependenciaFisicaQAAuto } from '../factories/dependencia-fisica.factory';
import {
  abrirEdicaoDependenciaFisica,
  confirmarExclusaoDependenciaFisica,
  linhaDependenciaFisica,
  pesquisarDependenciaFisica,
  tituloConsultaDependenciaFisica,
} from '../helpers/navigation/dependencia-fisica.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface DependenciaFisicaExcluida {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoDependenciaFisica {
  totalExcluidas: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui somente a Dependência Física QAAUTO de descrição exata, abrindo-a pela grade e usando "Excluir". */
export async function excluirDependenciaFisica(page: Page, descricao: string): Promise<DependenciaFisicaExcluida> {
  const alvo = descricao.trim();
  if (!isDependenciaFisicaQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de uma Dependência Física QAAUTO.');
  }

  await pesquisarDependenciaFisica(page, alvo);
  const encontradas = await linhaDependenciaFisica(page, alvo).count();
  if (encontradas !== 1) {
    throw new Error(
      `Esperada 1 Dependência Física "${alvo}" na consulta, encontrada(s) ${encontradas}. `
      + 'Execute criar_dependencia_fisica_action antes, ajuste a descrição em '
      + 'dados_exclusao_dependencia_fisica.json ou remova a duplicidade manualmente.',
    );
  }

  await abrirEdicaoDependenciaFisica(page, alvo);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusaoDependenciaFisica(page);

  await expect(page.getByText(/Dependência física exclu[ií]da com sucesso!/i)).toBeVisible({ timeout: 20000 });
  await expect(tituloConsultaDependenciaFisica(page)).toBeVisible({ timeout: 20000 });
  await pesquisarDependenciaFisica(page, alvo);
  await expect(linhaDependenciaFisica(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Dependência Física excluída e ausência conferida: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}

/** A primeira coluna da grade é oculta/vazia; a descrição é a 3ª célula. */
function celulasDescricao(page: Page): Locator {
  return page.locator('#main #grid table tbody tr td:nth-child(3)');
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e remove só descrições iniciadas por
 * QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirDependenciasFisicasEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoDependenciaFisica> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoDependenciaFisica = {
    totalExcluidas: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarDependenciaFisica(page, 'QAAUTO');
    const descricoes = (await celulasDescricao(page).allInnerTexts()).map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isDependenciaFisicaQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirDependenciaFisica(page, proxima);
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
