import { expect, type Page } from '@playwright/test';
import { select2 } from './select2.helper';

function normalizar(texto: string): string {
  return texto.trim().toLocaleLowerCase('pt-BR');
}

/** Espera a lista de um select em cascata carregar (o SGE preenche as opções depois da escolha do campo anterior). */
export async function esperarOpcoesCarregadas(page: Page, idSelect: string, nomeCampo: string): Promise<void> {
  const select = page.locator(`#${idSelect}`);
  await expect.poll(async () => select.locator('option').evaluateAll((opcoes) =>
    opcoes.filter((opcao) => (opcao as HTMLOptionElement).value !== '').length
  ), {
    timeout: 15000,
    message: `A lista de ${nomeCampo} não terminou de carregar depois da seleção do campo anterior.`,
  }).toBeGreaterThan(0);
}

/**
 * Seleciona um dado de apoio no Select2 (cadastro que a automação não cria). Falha dizendo o que falta quando a
 * lista está vazia, quando a opção não existe (listando as encontradas) ou quando é ambígua.
 */
export async function selecionarOpcaoApoio(
  page: Page,
  idSelect: string,
  desejada: string,
  nomeCadastro: string,
  tipoTurma: string,
): Promise<void> {
  const trigger = page.locator(`#s2id_${idSelect}`).locator('.select2-choice, .select2-choices').first();
  await expect(trigger).toBeVisible();
  await trigger.click();

  const dropdown = page.locator('#select2-drop:visible').first();
  await expect(dropdown).toBeVisible();
  const opcoes = dropdown.locator('ul.select2-results li.select2-result-selectable');
  const textos = (await opcoes.allInnerTexts()).map((texto) => texto.trim()).filter(Boolean);
  await page.keyboard.press('Escape');

  if (textos.length === 0) {
    throw new Error(`Nenhum registro de ${nomeCadastro} está disponível para a ${tipoTurma}.`);
  }
  const correspondencias = textos.filter((texto) => normalizar(texto) === normalizar(desejada));
  if (correspondencias.length === 0) {
    throw new Error(`${nomeCadastro} "${desejada}" não encontrado. Opções disponíveis: ${textos.join(' | ')}.`);
  }
  if (correspondencias.length > 1) {
    throw new Error(`${nomeCadastro} "${desejada}" corresponde a mais de uma opção: ${correspondencias.join(' | ')}.`);
  }
  await select2.select(page, `#${idSelect}`, desejada, { exactMatch: true, searchText: desejada });
}
