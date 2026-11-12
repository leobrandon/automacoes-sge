import { expect, type Page } from '@playwright/test';
import {
  baseDescricaoAlergia,
  buildAlergia,
  type AlergiaData,
  type BuildAlergiaOptions,
} from '../factories/alergia.factory';
import {
  confirmarAvisoAlergia,
  linhaAlergia,
  navegarParaAdicionarAlergia,
  pesquisarAlergia,
} from '../helpers/navigation/alergia.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface AlergiaCriada extends AlergiaData {
  url: string;
}

/** O SGE recusa descrição repetida: usa a primeira sequência livre a partir da pedida. */
async function proximaSequenciaLivreAlergia(
  page: Page,
  options: BuildAlergiaOptions,
  inicial: number,
): Promise<number> {
  const base = baseDescricaoAlergia(options);
  await pesquisarAlergia(page, base);
  const celulas = await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts();
  const existentes = new Set(celulas.map((texto) => texto.trim()));

  let sequencia = inicial;
  while (existentes.has(`${base} ${sequencia}`)) sequencia++;
  return sequencia;
}

async function definirAtivo(page: Page, valor: 'Sim' | 'Não'): Promise<void> {
  const controle = page.locator('#modalAlergia #Ativo');
  const esperado = valor === 'Sim';
  if (await controle.isChecked() !== esperado) {
    await page.locator('#modalAlergia .toggle').click();
  }
  await expect(controle).toBeChecked({ checked: esperado });
}

/** Cria pelo modal "Adicionar Alergia" e verifica a persistência na grade filtrada. */
export async function criarAlergia(
  page: Page,
  options: BuildAlergiaOptions = {},
  sequencia = 1,
): Promise<AlergiaCriada> {
  const livre = await proximaSequenciaLivreAlergia(page, options, sequencia);
  const dados = buildAlergia(options, livre);
  await navegarParaAdicionarAlergia(page);

  const modal = page.locator('#modalAlergia');
  await modal.locator('#Descricao').fill(dados.descricao);
  await definirAtivo(page, dados.ativo);

  const adicionar = getByRoleSge(modal, 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await confirmarAvisoAlergia(page, /Alergia adicionada/i);
  await expect(modal).toBeHidden({ timeout: 15000 });

  await pesquisarAlergia(page, dados.descricao);
  const linha = linhaAlergia(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const iconeAtivo = linha.locator('td.ativo i.fa-check');
  await expect(iconeAtivo).toHaveCount(dados.ativo === 'Sim' ? 1 : 0);
  return { ...dados, url: page.url() };
}
