import { expect, type Locator, type Page } from '@playwright/test';
import { isDependenciaFisicaDaEscolaQAAuto } from '../factories/dependencia-fisica-da-escola.factory';
import {
  abrirEdicaoDependenciaFisicaDaEscola,
  confirmarExclusaoDependenciaFisicaDaEscola,
  linhaDependenciaFisicaDaEscola,
  carregarGradeDependenciaFisicaDaEscola,
  tituloConsultaDependenciaFisicaDaEscola,
} from '../helpers/navigation/dependencia-fisica-da-escola.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface DependenciaFisicaDaEscolaExcluida {
  dependenciaFisica: string;
  escola: string;
  url: string;
}

export interface ResultadoLoteExclusaoDependenciaFisicaDaEscola {
  totalExcluidas: number;
  excluidas: Array<{ dependenciaFisica: string; escola: string }>;
  falhas: Array<{ dependenciaFisica: string; escola: string; motivo: string }>;
}

/** Exclui somente o vínculo de uma Dependência Física QAAUTO (descrição exata) com a escola informada. */
export async function excluirDependenciaFisicaDaEscola(
  page: Page,
  dependenciaFisica: string,
  escola: string,
): Promise<DependenciaFisicaDaEscolaExcluida> {
  const alvo = dependenciaFisica.trim();
  const escolaAlvo = escola.trim();
  if (!isDependenciaFisicaDaEscolaQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de uma Dependência Física QAAUTO.');
  }
  if (!escolaAlvo) throw new Error('Informe a escola do vínculo a ser excluído.');

  await carregarGradeDependenciaFisicaDaEscola(page);
  const encontrados = await linhaDependenciaFisicaDaEscola(page, alvo, escolaAlvo).count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 vínculo "${alvo}" na escola "${escolaAlvo}", encontrado ${encontrados}. `
      + 'Execute criar_dependencia_fisica_da_escola_action antes ou ajuste '
      + 'dados_exclusao_dependencia_fisica_da_escola.json.',
    );
  }

  await abrirEdicaoDependenciaFisicaDaEscola(page, alvo, escolaAlvo);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusaoDependenciaFisicaDaEscola(page);

  await expect(page.getByText(/Dependência física exclu[ií]da com sucesso!/i)).toBeVisible({ timeout: 20000 });
  await expect(tituloConsultaDependenciaFisicaDaEscola(page)).toBeVisible({ timeout: 20000 });
  await carregarGradeDependenciaFisicaDaEscola(page);
  await expect(linhaDependenciaFisicaDaEscola(page, alvo, escolaAlvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Dependência Física da Escola excluída e ausência conferida: ${alvo} | ${escolaAlvo}`);
  return { dependenciaFisica: alvo, escola: escolaAlvo, url: page.url() };
}

function linhasGrade(page: Page): Locator {
  return page.locator('#main #grid table tbody tr');
}

/** Colunas da grade: [oculta, Dependência, Tipo, Quantidade, PCD, Condição, Escola "NOME - código", Ativo]. */
async function vinculosVisiveis(page: Page): Promise<Array<{ dependenciaFisica: string; escola: string }>> {
  const celulas = await linhasGrade(page).evaluateAll((linhas) => linhas.map((linha) => {
    const textos = Array.from((linha as HTMLTableRowElement).cells).map((celula) => celula.innerText.trim());
    return { dependenciaFisica: textos[1] ?? '', escola: textos[6] ?? '' };
  }));
  return celulas
    .map((item) => ({ ...item, escola: item.escola.replace(/\s*-\s*\d+$/, '') }))
    .filter((item) => item.dependenciaFisica && item.escola);
}

/**
 * Percorre a grade (100 por página) repetidamente e remove só vínculos de Dependências
 * Físicas iniciadas por QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirDependenciasFisicasDaEscolaEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoDependenciaFisicaDaEscola> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoDependenciaFisicaDaEscola = {
    totalExcluidas: 0,
    excluidas: [],
    falhas: [],
  };
  const tentados = new Set<string>();

  while (true) {
    await carregarGradeDependenciaFisicaDaEscola(page);
    const proximo = (await vinculosVisiveis(page)).find(
      (item) => isDependenciaFisicaDaEscolaQAAuto(item.dependenciaFisica)
        && !tentados.has(`${item.dependenciaFisica}|${item.escola}`),
    );
    if (!proximo) break;

    tentados.add(`${proximo.dependenciaFisica}|${proximo.escola}`);
    try {
      await excluirDependenciaFisicaDaEscola(page, proximo.dependenciaFisica, proximo.escola);
      resultado.excluidas.push(proximo);
    } catch (erro) {
      resultado.falhas.push({ ...proximo, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  resultado.totalExcluidas = resultado.excluidas.length;
  return resultado;
}
