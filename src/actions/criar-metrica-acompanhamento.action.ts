import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildMetricaAcompanhamento,
  type BuildMetricaAcompanhamentoOptions,
  type MetricaAcompanhamentoData,
} from '../factories/metrica-acompanhamento.factory';
import {
  abrirModalAdicionarMetricaAcompanhamento,
  confirmarAvisoMetricaAcompanhamento,
  linhaMetricaAcompanhamento,
  modalMetricaAcompanhamento,
  navegarParaConsultaMetricaAcompanhamento,
  proximaSequenciaLivreMetricaAcompanhamento,
} from '../helpers/navigation/metrica-acompanhamento.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface MetricaAcompanhamentoCriada extends MetricaAcompanhamentoData {
  url: string;
}

/**
 * A pontuação usa máscara de centavos: `fill` não aciona a máscara e o SGE grava 0. Digitar os dígitos
 * (valor × 100) produz "10,00" e é o que um usuário faz.
 */
async function preencherPontuacao(campo: Locator, valor: number): Promise<void> {
  await campo.click();
  await campo.press('Control+A');
  await campo.pressSequentially(String(valor * 100));
  await expect(campo).toHaveValue(`${valor},00`);
}

/** Cria pelo modal e prova a persistência recarregando a grade pelo menu e reabrindo o registro. */
export async function criarMetricaAcompanhamento(
  page: Page,
  options: BuildMetricaAcompanhamentoOptions = {},
  sequencia = 1,
): Promise<MetricaAcompanhamentoCriada> {
  // A faixa de pontuação não pode se sobrepor a outra: a primeira sequência com faixa livre vale.
  const sequenciaLivre = await proximaSequenciaLivreMetricaAcompanhamento(page, options, sequencia);
  const dados = buildMetricaAcompanhamento(options, sequenciaLivre);

  const modal = await abrirModalAdicionarMetricaAcompanhamento(page);
  await preencherPontuacao(modal.locator('#PontuacaoMinima'), dados.pontuacaoMinima);
  await preencherPontuacao(modal.locator('#PontuacaoMaxima'), dados.pontuacaoMaxima);
  await modal.locator('#Nome').fill(dados.classificacao);
  if (dados.cor) await modal.locator('#Cor').fill(dados.cor);
  if (dados.descricao) await modal.locator('#Descricao').fill(dados.descricao);

  const salvar = getByRoleSge(modal, 'button', { name: 'Salvar' });
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByRole('dialog').filter({ hasText: /Métrica salva com sucesso/i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible()) {
    const aviso = (await atencao.first().innerText()).replace(/\s+/g, ' ').trim();
    const validacoes = (await modal.locator('.span-error-validator:visible').allInnerTexts())
      .map((texto) => texto.trim()).filter(Boolean);
    throw new Error(
      `O SGE não aceitou a Métrica "${dados.classificacao}" (${aviso}). `
      + `Validações visíveis: ${validacoes.join(' | ') || 'nenhuma'}.`,
    );
  }

  await confirmarAvisoMetricaAcompanhamento(page, 'Ok');
  await expect(modal).toBeHidden({ timeout: 15000 });

  // Recarrega pelo menu para ler o que o servidor guardou.
  await navegarParaConsultaMetricaAcompanhamento(page, true);
  const linha = linhaMetricaAcompanhamento(
    page, dados.classificacao, dados.pontuacaoMinima, dados.pontuacaoMaxima,
  );
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(getByRoleSge(linha, 'cell', { name: 'Ativa', exact: true })).toBeVisible();

  // Reabre pelo botão Editar para conferir o que foi gravado.
  // Botão só com ícone: o glifo do Font Awesome vira o nome acessível, então o title é o identificador estável.
  const editar = linha.locator('button[title="Editar"]');
  await expect(editar).toBeVisible();
  await editar.click();
  const edicao = modalMetricaAcompanhamento(page);
  await expect(edicao).toBeVisible({ timeout: 15000 });
  await expect(edicao.locator('#Nome')).toHaveValue(dados.classificacao, { timeout: 15000 });
  await expect(edicao.locator('#PontuacaoMinima')).toHaveValue(`${dados.pontuacaoMinima},00`);
  await expect(edicao.locator('#PontuacaoMaxima')).toHaveValue(`${dados.pontuacaoMaxima},00`);
  if (dados.cor) await expect(edicao.locator('#Cor')).toHaveValue(dados.cor);
  if (dados.descricao) await expect(edicao.locator('#Descricao')).toHaveValue(dados.descricao);
  await expect(edicao.locator('#Ativo')).toBeChecked();
  await getByRoleSge(edicao.locator('.modal-footer'), 'button', { name: 'Fechar' }).click();
  await expect(edicao).toBeHidden({ timeout: 15000 });

  console.log(
    `[QAAUTO] Métrica criada e conferida: ${dados.classificacao} (${dados.pontuacaoMinima} a ${dados.pontuacaoMaxima})`,
  );
  return { ...dados, url: page.url() };
}
