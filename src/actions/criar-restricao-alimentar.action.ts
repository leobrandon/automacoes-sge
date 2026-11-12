import { expect, type Page } from '@playwright/test';
import {
  baseDescricaoRestricaoAlimentar,
  buildRestricaoAlimentar,
  type BuildRestricaoAlimentarOptions,
  type RestricaoAlimentarData,
} from '../factories/restricao-alimentar.factory';
import {
  confirmarAvisoRestricaoAlimentar,
  linhaRestricaoAlimentar,
  navegarParaAdicionarRestricaoAlimentar,
  pesquisarRestricaoAlimentar,
} from '../helpers/navigation/restricao-alimentar.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface RestricaoAlimentarCriada extends RestricaoAlimentarData {
  url: string;
}

/** O SGE recusa descrição repetida: usa a primeira sequência livre a partir da pedida. */
async function proximaSequenciaLivreRestricaoAlimentar(
  page: Page,
  options: BuildRestricaoAlimentarOptions,
  inicial: number,
): Promise<number> {
  const base = baseDescricaoRestricaoAlimentar(options);
  await pesquisarRestricaoAlimentar(page, base);
  const celulas = await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts();
  const existentes = new Set(celulas.map((texto) => texto.trim()));

  let sequencia = inicial;
  while (existentes.has(`${base} ${sequencia}`)) sequencia++;
  return sequencia;
}

async function definirAtivo(page: Page, valor: 'Sim' | 'Não'): Promise<void> {
  const controle = page.locator('#modalRestricaoAlimentar #Ativo');
  const esperado = valor === 'Sim';
  if (await controle.isChecked() !== esperado) {
    await page.locator('#modalRestricaoAlimentar .toggle').click();
  }
  await expect(controle).toBeChecked({ checked: esperado });
}

/** Cria pelo modal "Adicionar Restrição Alimentar" e verifica a persistência na grade filtrada. */
export async function criarRestricaoAlimentar(
  page: Page,
  options: BuildRestricaoAlimentarOptions = {},
  sequencia = 1,
): Promise<RestricaoAlimentarCriada> {
  const livre = await proximaSequenciaLivreRestricaoAlimentar(page, options, sequencia);
  const dados = buildRestricaoAlimentar(options, livre);
  await navegarParaAdicionarRestricaoAlimentar(page);

  const modal = page.locator('#modalRestricaoAlimentar');
  await modal.locator('#Descricao').fill(dados.descricao);
  await definirAtivo(page, dados.ativo);

  const adicionar = getByRoleSge(modal, 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await confirmarAvisoRestricaoAlimentar(page, /Restrição alimentar adicionada/i);
  await expect(modal).toBeHidden({ timeout: 15000 });

  await pesquisarRestricaoAlimentar(page, dados.descricao);
  const linha = linhaRestricaoAlimentar(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const iconeAtivo = linha.locator('td.ativo i.fa-check');
  await expect(iconeAtivo).toHaveCount(dados.ativo === 'Sim' ? 1 : 0);
  return { ...dados, url: page.url() };
}
