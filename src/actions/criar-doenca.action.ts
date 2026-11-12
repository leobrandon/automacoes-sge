import { expect, type Page } from '@playwright/test';
import {
  baseDescricaoDoenca,
  buildDoenca,
  type DoencaData,
  type BuildDoencaOptions,
} from '../factories/doenca.factory';
import {
  confirmarAvisoDoenca,
  linhaDoenca,
  navegarParaAdicionarDoenca,
  pesquisarDoenca,
} from '../helpers/navigation/doenca.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface DoencaCriada extends DoencaData {
  url: string;
}

/** O SGE recusa descrição repetida: usa a primeira sequência livre a partir da pedida. */
async function proximaSequenciaLivreDoenca(
  page: Page,
  options: BuildDoencaOptions,
  inicial: number,
): Promise<number> {
  const base = baseDescricaoDoenca(options);
  await pesquisarDoenca(page, base);
  const celulas = await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts();
  const existentes = new Set(celulas.map((texto) => texto.trim()));

  let sequencia = inicial;
  while (existentes.has(`${base} ${sequencia}`)) sequencia++;
  return sequencia;
}

async function definirAtivo(page: Page, valor: 'Sim' | 'Não'): Promise<void> {
  const controle = page.locator('#modalDoenca #Ativo');
  const esperado = valor === 'Sim';
  if (await controle.isChecked() !== esperado) {
    await page.locator('#modalDoenca .toggle').click();
  }
  await expect(controle).toBeChecked({ checked: esperado });
}

/** Cria pelo modal "Adicionar Doença" e verifica a persistência na grade filtrada. */
export async function criarDoenca(
  page: Page,
  options: BuildDoencaOptions = {},
  sequencia = 1,
): Promise<DoencaCriada> {
  const livre = await proximaSequenciaLivreDoenca(page, options, sequencia);
  const dados = buildDoenca(options, livre);
  await navegarParaAdicionarDoenca(page);

  const modal = page.locator('#modalDoenca');
  await modal.locator('#Descricao').fill(dados.descricao);
  await definirAtivo(page, dados.ativo);

  const adicionar = getByRoleSge(modal, 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await confirmarAvisoDoenca(page, /Doença adicionada/i);
  await expect(modal).toBeHidden({ timeout: 15000 });

  await pesquisarDoenca(page, dados.descricao);
  const linha = linhaDoenca(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const iconeAtivo = linha.locator('td.ativo i.fa-check');
  await expect(iconeAtivo).toHaveCount(dados.ativo === 'Sim' ? 1 : 0);
  return { ...dados, url: page.url() };
}
