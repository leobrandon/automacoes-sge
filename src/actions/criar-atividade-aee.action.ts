import { expect, type Page } from '@playwright/test';
import {
  buildAtividadeAee,
  type BuildAtividadeAeeOptions,
  type AtividadeAeeData,
} from '../factories/atividade-aee.factory';
import {
  confirmarAvisoAee,
  linhaAtividadeAee,
  navegarParaAdicionarAtividadeAee,
  pesquisarAtividadeAee,
} from '../helpers/navigation/atividade-aee.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface AtividadeAeeCriada extends AtividadeAeeData {
  url: string;
}

/** Seleciona a opção do select nativo pela interação de teclado visível. */
async function selecionarAtividadeAee(page: Page, desejada: string): Promise<void> {
  const select = page.locator('#main #AtividadesAEE');
  await expect(select).toBeVisible({ timeout: 15000 });
  await select.focus();
  await select.press('Home');

  const quantidade = await select.locator('option').count();
  let selecionada = (await select.locator('option:checked').textContent())?.trim();
  for (let indice = 0; indice < quantidade && selecionada !== desejada; indice++) {
    await select.press('ArrowDown');
    selecionada = (await select.locator('option:checked').textContent())?.trim();
  }
  if (selecionada !== desejada) {
    throw new Error(`A opção de Atividade de AEE "${desejada}" não está disponível no formulário.`);
  }
  await select.press('Enter');
  await expect(select.locator('option:checked')).toHaveText(desejada, { timeout: 5000 });
}

async function definirAtivo(page: Page, valor: 'Sim' | 'Não'): Promise<void> {
  const controle = page.locator('#main #Ativo');
  const esperado = valor === 'Sim';
  if (await controle.isChecked() !== esperado) {
    await page.locator('#main label:has(#Ativo) .toggle').click();
  }
  await expect(controle).toBeChecked({ checked: esperado });
}

/** Cria pela interface e verifica a persistência na grade filtrada. */
export async function criarAtividadeAee(
  page: Page,
  options: BuildAtividadeAeeOptions = {},
  sequencia = 1,
): Promise<AtividadeAeeCriada> {
  const dados = buildAtividadeAee(options, sequencia);
  await navegarParaAdicionarAtividadeAee(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao').fill(dados.descricao);
  await selecionarAtividadeAee(page, dados.atividadeAee);
  await definirAtivo(page, dados.ativo);

  const salvar = getByRoleSge(formulario, 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();
  await salvar.click();
  const sucesso = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Ok', exact: true }) });
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  await confirmarAvisoAee(page, 'Ok');

  await pesquisarAtividadeAee(page, dados.descricao);
  const linha = linhaAtividadeAee(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(getByRoleSge(linha, 'cell', { name: dados.atividadeAee, exact: true })).toBeVisible();
  return { ...dados, url: page.url() };
}
