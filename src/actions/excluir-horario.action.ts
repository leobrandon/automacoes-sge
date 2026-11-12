import { expect, type Locator, type Page } from '@playwright/test';
import { isHorarioQAAuto } from '../factories/horario.factory';
import {
  abrirEdicaoHorario,
  confirmarExclusaoHorario,
  linhaHorario,
  pesquisarHorario,
  tituloConsultaHorario,
} from '../helpers/navigation/horario.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface HorarioExcluido {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoHorario {
  totalExcluidos: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui somente o Horário QAAUTO de descrição exata, abrindo-o pela grade e usando "Excluir". */
export async function excluirHorario(page: Page, descricao: string): Promise<HorarioExcluido> {
  const alvo = descricao.trim();
  if (!isHorarioQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de um Horário QAAUTO.');
  }

  await pesquisarHorario(page, alvo);
  const encontrados = await linhaHorario(page, alvo).count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Horário "${alvo}" na consulta, encontrado ${encontrados}. `
      + 'Execute criar_horario_action antes, ajuste a descrição em dados_exclusao_horario.json '
      + 'ou remova a duplicidade manualmente (o SGE aceita descrições repetidas em Horários).',
    );
  }

  await abrirEdicaoHorario(page, alvo);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => /^\/pontohorario\/excluir\/\d+$/i.test(new URL(response.url()).pathname), { timeout: 20000 }),
    confirmarExclusaoHorario(page),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A exclusão do Horário retornou HTTP ${resposta.status()}.`);
  }

  await expect(tituloConsultaHorario(page)).toBeVisible({ timeout: 20000 });
  await pesquisarHorario(page, alvo);
  await expect(linhaHorario(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Horário excluído e ausência conferida: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}

function celulasDescricao(page: Page): Locator {
  return page.locator('#main #grid table tbody tr td:nth-child(2)');
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e remove só descrições iniciadas por
 * QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirHorariosEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoHorario> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoHorario = {
    totalExcluidos: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarHorario(page, 'QAAUTO');
    const descricoes = (await celulasDescricao(page).allInnerTexts()).map((texto) => texto.trim());
    const proxima = descricoes.find((descricao) => isHorarioQAAuto(descricao) && !tentadas.has(descricao));
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirHorario(page, proxima);
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
