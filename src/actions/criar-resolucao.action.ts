import { expect, type Page } from '@playwright/test';
import {
  buildResolucao,
  type BuildResolucaoOptions,
  type ResolucaoData,
} from '../factories/resolucao.factory';
import { datepicker } from '../helpers/datepicker.helper';
import { select2 } from '../helpers/select2.helper';
import {
  confirmarAvisoResolucao,
  linhaResolucao,
  modalResolucao,
  navegarParaConsultaResolucao,
  pesquisarResolucao,
} from '../helpers/navigation/resolucao.navigation';

export async function criarResolucao(
  page: Page,
  options: BuildResolucaoOptions = {},
  sequencia = 1,
): Promise<ResolucaoData & { url: string }> {
  const dados = buildResolucao(options, sequencia);
  await navegarParaConsultaResolucao(page);
  await page.locator('#main #adicionarResolucao').click();
  const modal = modalResolucao(page);
  await expect(modal).toBeVisible();
  await modal.locator('#s2id_AnoLetivoId .select2-choice').click();
  const dropdown = page.locator('#select2-drop:visible');
  await expect(dropdown).toBeVisible();
  const opcoes = dropdown.locator('li.select2-result-selectable');
  await expect(opcoes.or(dropdown.locator('.select2-no-results'))).not.toHaveCount(0);
  const anos = (await opcoes.allInnerTexts()).map((x) => x.trim()).filter(Boolean);
  await page.keyboard.press('Escape');
  if (!anos.length)
    throw new Error(
      'Nenhum ano letivo disponível. Cadastre um ano letivo antes de criar uma resolução.',
    );
  if (!anos.includes(dados.anoLetivo))
    throw new Error(`Ano letivo ${dados.anoLetivo} indisponível. Opções: ${anos.join(' | ')}.`);
  await modal.locator('#Descricao').fill(dados.descricao);
  await select2.select(page, '#AnoLetivoId', dados.anoLetivo, { exactMatch: true });
  await datepicker.fill(page, '#DataInicial', dados.dataInicial);
  await modal.locator('#btnSalvar').click();
  await confirmarAvisoResolucao(page, /Resolução adicionada\./i);
  await expect(modal).toBeHidden();
  await pesquisarResolucao(page, dados.descricao);
  await expect(linhaResolucao(page, dados.descricao)).toHaveCount(1);
  return { ...dados, url: page.url() };
}
