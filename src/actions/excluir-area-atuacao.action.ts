import { expect, type Page } from '@playwright/test';
import { isAreaAtuacaoQAAuto } from '../factories/area-atuacao.factory';
import {
  confirmarAvisoAreaAtuacao,
  linhaAreaAtuacao,
  pesquisarAreaAtuacao,
} from '../helpers/navigation/area-atuacao.navigation';

export interface AreaAtuacaoExcluida {
  descricao: string;
  url: string;
}

/** Exclui somente a Área de atuação QAAUTO de descrição exata, pela lixeira da linha. */
export async function excluirAreaAtuacao(page: Page, descricao: string): Promise<AreaAtuacaoExcluida> {
  const alvo = descricao.trim();
  if (!isAreaAtuacaoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata de uma Área de atuação QAAUTO.');
  }

  await pesquisarAreaAtuacao(page, alvo);
  const linha = linhaAreaAtuacao(page, alvo);
  const encontrados = await linha.count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Área de atuação "${alvo}" na consulta, encontradas ${encontrados}. `
      + 'Execute criar_area_atuacao_action antes ou ajuste a descrição em dados_exclusao_area_atuacao.json.',
    );
  }

  // Botão só com ícone: o glifo do Font Awesome vira o nome acessível, então o title é o identificador estável.
  const excluir = linha.locator('button[title="Excluir"]');
  await expect(excluir).toBeVisible();
  await excluir.click();

  const confirmacao = page.getByRole('dialog').filter({ hasText: /Deseja excluir esta área de atuação/i });
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

  // O SweetAlert reaproveita o mesmo diálogo: a pergunta some antes do resultado aparecer.
  await expect(confirmacao).toBeHidden({ timeout: 15000 });
  const sucesso = page.getByRole('dialog').filter({ hasText: /Área de atuação excluída com sucesso/i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible() && !await sucesso.first().isVisible()) {
    const aviso = (await atencao.first().innerText()).replace(/\s+/g, ' ').trim();
    await confirmarAvisoAreaAtuacao(page, 'Ok'); // o aviso bloqueia a tela até o Ok
    throw new Error(`O SGE não excluiu a Área de atuação "${alvo}": ${aviso}`);
  }
  await confirmarAvisoAreaAtuacao(page, 'Ok');

  await pesquisarAreaAtuacao(page, alvo);
  await expect(linhaAreaAtuacao(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Área de atuação excluída e ausência conferida: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}

export interface ResultadoLoteExclusaoAreaAtuacao {
  totalExcluidas: number;
  excluidas: string[];
  /** Recusadas pelo SGE por vínculo (ex.: área usada por um Tipo de pauta): ficam no ambiente, sem falhar o lote. */
  mantidasPorVinculo: Array<{ descricao: string; motivo: string }>;
  /** Qualquer outro erro: isto sim indica problema. */
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Recusa do SGE por registro em uso/associado (não é defeito da automação). */
const RECUSA_POR_VINCULO = /associad|vincul|possui|em uso|utiliz/i;

/**
 * Remove as Áreas de atuação cuja descrição começa com QAAUTO. As que o SGE recusa por vínculo (usadas por
 * Tipo de pauta) são listadas em `mantidasPorVinculo` e o lote segue; outros erros vão para `falhas`.
 */
export async function excluirAreasAtuacaoEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoAreaAtuacao> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoAreaAtuacao = { totalExcluidas: 0, excluidas: [], mantidasPorVinculo: [], falhas: [] };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarAreaAtuacao(page, 'QAAUTO');
    const descricoes = (await page.locator('#main #grid table tbody td.pauta-area-nome').allInnerTexts())
      .map((texto) => texto.trim());
    // O SGE trata nomes sem diferenciar maiúsculas, então a marcação de "já tentada" também não diferencia.
    const proxima = descricoes.find((d) => isAreaAtuacaoQAAuto(d) && !tentadas.has(d.toLowerCase()));
    if (!proxima) break;

    tentadas.add(proxima.toLowerCase());
    try {
      await excluirAreaAtuacao(page, proxima);
      resultado.excluidas.push(proxima);
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : String(erro);
      (RECUSA_POR_VINCULO.test(motivo) ? resultado.mantidasPorVinculo : resultado.falhas).push({ descricao: proxima, motivo });
    }
  }

  resultado.totalExcluidas = resultado.excluidas.length;
  return resultado;
}
