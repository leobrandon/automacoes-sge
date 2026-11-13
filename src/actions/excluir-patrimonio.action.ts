import { expect, type Page } from '@playwright/test';
import { isPatrimonioQAAuto } from '../factories/patrimonio.factory';
import {
  abrirEdicaoPatrimonio,
  confirmarAvisoPatrimonio,
  linhaPatrimonio,
  pesquisarPatrimonio,
  tituloConsultaPatrimonio,
} from '../helpers/navigation/patrimonio.navigation';

export interface PatrimonioExcluido {
  placa: string;
  url: string;
}

/** Exclui somente o Patrimônio QAAUTO de placa exata, abrindo-o pela grade e usando "Excluir". */
export async function excluirPatrimonio(page: Page, placa: string): Promise<PatrimonioExcluido> {
  const alvo = placa.trim();
  if (!isPatrimonioQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a placa exata de um Patrimônio QAAUTO.');
  }

  await pesquisarPatrimonio(page, alvo);
  const encontrados = await linhaPatrimonio(page, alvo).count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Patrimônio com a placa "${alvo}" na consulta, encontrados ${encontrados}. `
      + 'Execute criar_patrimonio_action antes ou ajuste a placa em dados_exclusao_patrimonio.json.',
    );
  }

  await abrirEdicaoPatrimonio(page, alvo);
  const excluir = page.locator('#main #btn_excluir');
  await expect(excluir).toBeVisible();
  await excluir.click();

  const confirmacao = page.getByRole('dialog').filter({ hasText: /irá deletar o patrimônio selecionado/i });
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

  // O aviso de sucesso não fecha sozinho: bloqueia a tela até o Ok.
  const sucesso = page.getByRole('dialog').filter({ hasText: /Patrimônio excluído/i });
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  await confirmarAvisoPatrimonio(page, 'Ok');
  await expect(tituloConsultaPatrimonio(page)).toBeVisible({ timeout: 20000 });
  await pesquisarPatrimonio(page, alvo);
  await expect(linhaPatrimonio(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Patrimônio excluído e ausência conferida: ${alvo}`);
  return { placa: alvo, url: page.url() };
}
