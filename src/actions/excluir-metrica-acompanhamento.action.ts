import { expect, type Page } from '@playwright/test';
import {
  isMetricaAcompanhamentoQAAuto,
  rotuloFaixaMetrica,
} from '../factories/metrica-acompanhamento.factory';
import {
  confirmarAvisoMetricaAcompanhamento,
  linhaMetricaPorFaixaTexto,
  metricasCadastradas,
  navegarParaConsultaMetricaAcompanhamento,
} from '../helpers/navigation/metrica-acompanhamento.navigation';

export interface AlvoMetricaAcompanhamento {
  classificacao: string;
  pontuacaoMinima: number;
  pontuacaoMaxima: number;
}

export interface MetricaAcompanhamentoExcluida extends AlvoMetricaAcompanhamento {
  url: string;
}

export interface ResultadoLoteExclusaoMetricaAcompanhamento {
  totalExcluidas: number;
  excluidas: string[];
  falhas: Array<{ metrica: string; motivo: string }>;
}

/** Exclui a Métrica QAAUTO de classificação e faixa (texto da grade) exatas, pela lixeira da linha. */
async function excluirPorFaixaTexto(page: Page, classificacao: string, faixa: string): Promise<void> {
  await navegarParaConsultaMetricaAcompanhamento(page, true);
  const linha = linhaMetricaPorFaixaTexto(page, classificacao, faixa);
  const encontrados = await linha.count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperada 1 Métrica "${classificacao}" com faixa ${faixa} na consulta, encontradas ${encontrados}. `
      + 'Execute criar_metrica_acompanhamento_action antes ou ajuste dados_exclusao_metrica_acompanhamento.json.',
    );
  }

  // Botão só com ícone: o glifo do Font Awesome vira o nome acessível, então o title é o identificador estável.
  const excluir = linha.locator('button[title="Excluir"]');
  await expect(excluir).toBeVisible();
  await excluir.click();

  const confirmacao = page.getByRole('dialog').filter({ hasText: /Deseja realmente excluir esta métrica/i });
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

  // O SweetAlert reaproveita o mesmo diálogo: a pergunta some antes do resultado aparecer.
  await expect(confirmacao).toBeHidden({ timeout: 15000 });
  const sucesso = page.getByRole('dialog').filter({ hasText: /Métrica excluída com sucesso/i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible() && !await sucesso.first().isVisible()) {
    const aviso = (await atencao.first().innerText()).replace(/\s+/g, ' ').trim();
    await confirmarAvisoMetricaAcompanhamento(page, 'Ok'); // o aviso bloqueia a tela até o Ok (o lote segue)
    throw new Error(`O SGE não excluiu a Métrica "${classificacao}" (${faixa}): ${aviso}`);
  }
  await confirmarAvisoMetricaAcompanhamento(page, 'Ok');

  await navegarParaConsultaMetricaAcompanhamento(page, true);
  await expect(linhaMetricaPorFaixaTexto(page, classificacao, faixa)).toHaveCount(0, { timeout: 15000 });
}

/** Exclui somente a Métrica QAAUTO de classificação e faixa exatas, pela lixeira da linha. */
export async function excluirMetricaAcompanhamento(
  page: Page,
  alvo: AlvoMetricaAcompanhamento,
): Promise<MetricaAcompanhamentoExcluida> {
  const classificacao = alvo.classificacao.trim();
  const { pontuacaoMinima: minima, pontuacaoMaxima: maxima } = alvo;
  if (!isMetricaAcompanhamentoQAAuto(classificacao)) {
    throw new Error('A exclusão automatizada exige a classificação exata de uma Métrica QAAUTO.');
  }
  const faixa = rotuloFaixaMetrica(minima, maxima);

  await excluirPorFaixaTexto(page, classificacao, faixa);

  console.log(`[QAAUTO] Métrica excluída e ausência conferida: ${classificacao} (${faixa})`);
  return { classificacao, pontuacaoMinima: minima, pontuacaoMaxima: maxima, url: page.url() };
}

/**
 * Remove todas as Métricas cuja classificação começa com QAAUTO (a consulta não tem pesquisa nem paginação,
 * então a grade inteira é relida a cada exclusão). Métricas de outros nomes, como as de produção
 * ("Em conformidade"), nunca são tocadas. Itens que falharem não são reprocessados.
 */
export async function excluirMetricasAcompanhamentoEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoMetricaAcompanhamento> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoMetricaAcompanhamento = { totalExcluidas: 0, excluidas: [], falhas: [] };
  const tentadas = new Set<string>();

  while (true) {
    await navegarParaConsultaMetricaAcompanhamento(page, true);
    const proxima = (await metricasCadastradas(page))
      .find((m) => isMetricaAcompanhamentoQAAuto(m.classificacao) && !tentadas.has(`${m.classificacao}|${m.faixa}`));
    if (!proxima) break;

    const identificacao = `${proxima.classificacao} (${proxima.faixa})`;
    tentadas.add(`${proxima.classificacao}|${proxima.faixa}`);
    try {
      await excluirPorFaixaTexto(page, proxima.classificacao, proxima.faixa);
      resultado.excluidas.push(identificacao);
      console.log(`[QAAUTO] Métrica excluída e ausência conferida: ${identificacao}`);
    } catch (erro) {
      resultado.falhas.push({ metrica: identificacao, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  resultado.totalExcluidas = resultado.excluidas.length;
  return resultado;
}
