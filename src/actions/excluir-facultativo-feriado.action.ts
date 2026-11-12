import { expect, type Locator, type Page } from '@playwright/test';
import { isFacultativoFeriadoQAAuto } from '../factories/facultativo-feriado.factory';
import {
  abrirEdicaoFacultativoFeriado,
  confirmarExclusaoFacultativoFeriado,
  linhaFacultativoFeriado,
  pesquisarFacultativoFeriado,
  tituloConsultaFacultativoFeriado,
} from '../helpers/navigation/facultativo-feriado.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface FacultativoFeriadoExcluido {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoFacultativoFeriado {
  totalExcluidos: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui somente o registro QAAUTO de descrição exata, abrindo-o pela grade e usando "Excluir". */
export async function excluirFacultativoFeriado(
  page: Page,
  descricao: string,
): Promise<FacultativoFeriadoExcluido> {
  const alvo = descricao.trim();
  if (!isFacultativoFeriadoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de um Feriado/Facultativo QAAUTO.');
  }

  await pesquisarFacultativoFeriado(page, alvo);
  const linha = linhaFacultativoFeriado(page, alvo);
  const encontrados = await linha.count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Feriado/Facultativo "${alvo}" na consulta, encontrado ${encontrados}. `
      + 'Execute criar_facultativo_feriado_action antes ou ajuste a descrição em dados_exclusao_facultativo_feriado.json.',
    );
  }

  await abrirEdicaoFacultativoFeriado(page, alvo);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return /^\/pontoferiado\/excluir\/\d+$/i.test(url.pathname);
    }, { timeout: 20000 }),
    confirmarExclusaoFacultativoFeriado(page),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A exclusão do Feriado/Facultativo retornou HTTP ${resposta.status()}.`);
  }

  await expect(tituloConsultaFacultativoFeriado(page)).toBeVisible({ timeout: 20000 });
  await pesquisarFacultativoFeriado(page, alvo);
  await expect(linhaFacultativoFeriado(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Feriado/Facultativo excluído e ausência conferida: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}

function celulasDescricao(page: Page): Locator {
  return page.locator('#main #grid table tbody tr td:nth-child(2)');
}

/** Percorre a grade pela interface e remove apenas descrições iniciadas por QAAUTO. */
export async function excluirFacultativosFeriadosEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoFacultativoFeriado> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoFacultativoFeriado = {
    totalExcluidos: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarFacultativoFeriado(page, 'QAAUTO');
    const descricoes = (await celulasDescricao(page).allInnerTexts()).map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isFacultativoFeriadoQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirFacultativoFeriado(page, proxima);
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
