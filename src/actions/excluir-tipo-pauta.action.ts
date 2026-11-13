import { expect, type Page } from '@playwright/test';
import { isTipoPautaQAAuto } from '../factories/tipo-pauta.factory';
import {
  abrirEdicaoTipoPauta,
  confirmarAvisoTipoPauta,
  linhaTipoPauta,
  pesquisarTipoPauta,
  tituloConsultaTipoPauta,
} from '../helpers/navigation/tipo-pauta.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface TipoPautaExcluido {
  nome: string;
  url: string;
}

/**
 * O SGE recusa excluir a pauta enquanto ela tem itens ("existem dados associados"). Excluir um agrupador
 * leva junto os itens vinculados a ele, então basta remover os agrupadores, um a um, pelo ícone da aba.
 */
async function removerAgrupadores(page: Page): Promise<void> {
  const formulario = page.locator('#main');
  const grupos = formulario.locator('#abaTipoPautaEstrutura .pauta-grupos-abas a');
  const total = await grupos.count();
  if (total === 0) return;

  await formulario.locator('.nav-tabs a').filter({ hasText: /Estrutura do formulário/ }).click();
  for (let restantes = total; restantes > 0; restantes--) {
    await expect(grupos).toHaveCount(restantes);
    // Ícone sem texto: o title identifica a ação.
    const remover = grupos.first().locator('[title="Excluir agrupador"]');
    await expect(remover).toBeVisible();
    await remover.click();

    const confirmacao = page.getByRole('dialog').filter({ hasText: /Deseja realmente excluir este agrupador/i });
    await expect(confirmacao).toBeVisible({ timeout: 15000 });
    await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();
    await expect(confirmacao).toBeHidden({ timeout: 15000 });

    const sucesso = page.getByRole('dialog').filter({ hasText: /O agrupador foi removido/i });
    const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
    await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
    if (await atencao.first().isVisible() && !await sucesso.first().isVisible()) {
      const aviso = (await atencao.first().innerText()).replace(/\s+/g, ' ').trim();
      await confirmarAvisoTipoPauta(page, 'Ok'); // o aviso bloqueia a tela até o Ok
      throw new Error(`O SGE não removeu o agrupador: ${aviso}`);
    }
    await confirmarAvisoTipoPauta(page, 'Ok');
  }
  await expect(grupos).toHaveCount(0);
}

/** Exclui somente o Tipo de pauta QAAUTO de nome exato, abrindo-o pela grade e usando "Excluir". */
export async function excluirTipoPauta(page: Page, nome: string): Promise<TipoPautaExcluido> {
  const alvo = nome.trim();
  if (!isTipoPautaQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige o nome exato de um Tipo de pauta QAAUTO.');
  }

  await pesquisarTipoPauta(page, alvo);
  const encontrados = await linhaTipoPauta(page, alvo).count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Tipo de pauta "${alvo}" na consulta, encontrados ${encontrados}. `
      + 'Execute criar_tipo_pauta_action antes ou ajuste o nome em dados_exclusao_tipo_pauta.json.',
    );
  }

  await abrirEdicaoTipoPauta(page, alvo);
  await removerAgrupadores(page);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/ });
  await expect(excluir).toBeVisible();
  await excluir.click();

  const confirmacao = page.getByRole('dialog').filter({ hasText: /Deseja realmente excluir este tipo de pauta/i });
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

  // O SweetAlert reaproveita o mesmo diálogo: a pergunta some antes do resultado aparecer.
  await expect(confirmacao).toBeHidden({ timeout: 15000 });
  const sucesso = page.getByRole('dialog').filter({ hasText: /Sucesso/i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible() && !await sucesso.first().isVisible()) {
    const aviso = (await atencao.first().innerText()).replace(/\s+/g, ' ').trim();
    await confirmarAvisoTipoPauta(page, 'Ok'); // o aviso bloqueia a tela até o Ok
    throw new Error(`O SGE não excluiu o Tipo de pauta "${alvo}": ${aviso}`);
  }
  await confirmarAvisoTipoPauta(page, 'Ok');

  await expect(tituloConsultaTipoPauta(page)).toBeVisible({ timeout: 20000 });
  await pesquisarTipoPauta(page, alvo);
  await expect(linhaTipoPauta(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Tipo de pauta excluído e ausência conferida: ${alvo}`);
  return { nome: alvo, url: page.url() };
}

export interface ResultadoLoteExclusaoTipoPauta {
  totalExcluidos: number;
  excluidos: string[];
  /** Recusados pelo SGE por vínculo (pauta com acompanhamento): ficam no ambiente, sem falhar o lote. */
  mantidosPorVinculo: Array<{ nome: string; motivo: string }>;
  /** Qualquer outro erro: isto sim indica problema. */
  falhas: Array<{ nome: string; motivo: string }>;
}

/** Recusa do SGE por registro com acompanhamento/dados associados (não é defeito da automação). */
const RECUSA_POR_VINCULO = /dados associados|possui acompanhamentos/i;

/**
 * Remove os Tipos de pauta cujo nome começa com QAAUTO. Pautas com acompanhamento não podem ser excluídas
 * (nem concluído desvincula): ficam em `mantidosPorVinculo` e o lote segue; outros erros vão para `falhas`.
 */
export async function excluirTiposPautaEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoTipoPauta> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoTipoPauta = { totalExcluidos: 0, excluidos: [], mantidosPorVinculo: [], falhas: [] };
  const tentados = new Set<string>();

  while (true) {
    await pesquisarTipoPauta(page, 'QAAUTO');
    const nomes = (await page.locator('#main #grid table tbody tr td:nth-child(2)').allInnerTexts())
      .map((texto) => texto.trim());
    const proximo = nomes.find((n) => isTipoPautaQAAuto(n) && !tentados.has(n.toLowerCase()));
    if (!proximo) break;

    tentados.add(proximo.toLowerCase());
    try {
      await excluirTipoPauta(page, proximo);
      resultado.excluidos.push(proximo);
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      (RECUSA_POR_VINCULO.test(motivo) ? resultado.mantidosPorVinculo : resultado.falhas).push({ nome: proximo, motivo });
    }
  }

  resultado.totalExcluidos = resultado.excluidos.length;
  return resultado;
}
