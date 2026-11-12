import { expect, type Page } from '@playwright/test';
import {
  baseDescricaoAtividadeFisica,
  buildAtividadeFisica,
  type AtividadeFisicaData,
  type BuildAtividadeFisicaOptions,
} from '../factories/atividade-fisica.factory';
import {
  confirmarAvisoAtividadeFisica,
  linhaAtividadeFisica,
  navegarParaAdicionarAtividadeFisica,
  pesquisarAtividadeFisica,
} from '../helpers/navigation/atividade-fisica.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface AtividadeFisicaCriada extends AtividadeFisicaData {
  url: string;
}

/** O SGE recusa descrição repetida: usa a primeira sequência livre a partir da pedida. */
async function proximaSequenciaLivreAtividadeFisica(
  page: Page,
  options: BuildAtividadeFisicaOptions,
  inicial: number,
): Promise<number> {
  const base = baseDescricaoAtividadeFisica(options);
  await pesquisarAtividadeFisica(page, base);
  const celulas = await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts();
  const existentes = new Set(celulas.map((texto) => texto.trim()));

  let sequencia = inicial;
  while (existentes.has(`${base} ${sequencia}`)) sequencia++;
  return sequencia;
}

async function definirAtivo(page: Page, valor: 'Sim' | 'Não'): Promise<void> {
  const controle = page.locator('#modalAtividadeFisica #Ativo');
  const esperado = valor === 'Sim';
  if (await controle.isChecked() !== esperado) {
    await page.locator('#modalAtividadeFisica .toggle').click();
  }
  await expect(controle).toBeChecked({ checked: esperado });
}

/** Cria pelo modal "Adicionar Atividade Fisica" e verifica a persistência na grade filtrada. */
export async function criarAtividadeFisica(
  page: Page,
  options: BuildAtividadeFisicaOptions = {},
  sequencia = 1,
): Promise<AtividadeFisicaCriada> {
  const livre = await proximaSequenciaLivreAtividadeFisica(page, options, sequencia);
  const dados = buildAtividadeFisica(options, livre);
  await navegarParaAdicionarAtividadeFisica(page);

  const modal = page.locator('#modalAtividadeFisica');
  await modal.locator('#Descricao').fill(dados.descricao);
  await definirAtivo(page, dados.ativo);

  const adicionar = getByRoleSge(modal, 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await confirmarAvisoAtividadeFisica(page, /Atividade fisica adicionada/i);
  await expect(modal).toBeHidden({ timeout: 15000 });

  await pesquisarAtividadeFisica(page, dados.descricao);
  const linha = linhaAtividadeFisica(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const iconeAtivo = linha.locator('td.ativo i.fa-check');
  await expect(iconeAtivo).toHaveCount(dados.ativo === 'Sim' ? 1 : 0);
  return { ...dados, url: page.url() };
}
