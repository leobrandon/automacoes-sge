import { expect, type Page } from '@playwright/test';
import {
  baseDescricaoMedicamento,
  buildMedicamento,
  type BuildMedicamentoOptions,
  type MedicamentoData,
} from '../factories/medicamento.factory';
import {
  confirmarAvisoMedicamento,
  linhaMedicamento,
  navegarParaAdicionarMedicamento,
  pesquisarMedicamento,
} from '../helpers/navigation/medicamento.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface MedicamentoCriado extends MedicamentoData {
  url: string;
}

/** O SGE recusa descrição repetida: usa a primeira sequência livre a partir da pedida. */
async function proximaSequenciaLivreMedicamento(
  page: Page,
  options: BuildMedicamentoOptions,
  inicial: number,
): Promise<number> {
  const base = baseDescricaoMedicamento(options);
  await pesquisarMedicamento(page, base);
  const celulas = await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts();
  const existentes = new Set(celulas.map((texto) => texto.trim()));

  let sequencia = inicial;
  while (existentes.has(`${base} ${sequencia}`)) sequencia++;
  return sequencia;
}

async function definirAtivo(page: Page, valor: 'Sim' | 'Não'): Promise<void> {
  const controle = page.locator('#modalMedicamento #Ativo');
  const esperado = valor === 'Sim';
  if (await controle.isChecked() !== esperado) {
    await page.locator('#modalMedicamento .toggle').click();
  }
  await expect(controle).toBeChecked({ checked: esperado });
}

/** Cria pelo modal "Adicionar Medicamento" e verifica a persistência na grade filtrada. */
export async function criarMedicamento(
  page: Page,
  options: BuildMedicamentoOptions = {},
  sequencia = 1,
): Promise<MedicamentoCriado> {
  const livre = await proximaSequenciaLivreMedicamento(page, options, sequencia);
  const dados = buildMedicamento(options, livre);
  await navegarParaAdicionarMedicamento(page);

  const modal = page.locator('#modalMedicamento');
  await modal.locator('#Descricao').fill(dados.descricao);
  await definirAtivo(page, dados.ativo);

  const adicionar = getByRoleSge(modal, 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await confirmarAvisoMedicamento(page, /Medicamento adicionado/i);
  await expect(modal).toBeHidden({ timeout: 15000 });

  await pesquisarMedicamento(page, dados.descricao);
  const linha = linhaMedicamento(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const iconeAtivo = linha.locator('td.ativo i.fa-check');
  await expect(iconeAtivo).toHaveCount(dados.ativo === 'Sim' ? 1 : 0);
  return { ...dados, url: page.url() };
}
