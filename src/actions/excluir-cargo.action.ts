import { expect, type Page } from '@playwright/test';
import type { CargoData } from '../factories/cargo.factory';
import { isCargoQAAuto } from '../factories/cargo.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { linhaCargo, pesquisarCargo } from '../helpers/navigation/cargo.navigation';

export interface CargoExcluido {
  descricao: string;
  url: string;
}

/** Exclui pela interface somente o Cargo QAAUTO que está aberto em edição. */
export async function excluirCargo(page: Page, cargo: Pick<CargoData, 'descricao' | 'tipo'>): Promise<CargoExcluido> {
  const descricao = cargo.descricao.trim();
  if (!isCargoQAAuto(descricao)) {
    throw new Error('A exclusão automatizada exige a descrição exata de um Cargo QAAUTO.');
  }

  const formulario = page.locator('#main');
  await expect(getByRoleSge(formulario, 'heading', { name: /Editar Cargo/i })).toBeVisible();
  await expect(formulario.locator('#Descricao')).toHaveValue(descricao);
  await expect(formulario.locator('#Tipo option:checked')).toHaveText(cargo.tipo);

  const excluirBotao = getByRoleSge(formulario, 'button', { name: /Excluir/i });
  const excluirLink = getByRoleSge(formulario, 'link', { name: /Excluir/i });
  const excluir = excluirBotao.or(excluirLink);
  await expect(excluir).toBeVisible();
  await excluir.click();

  await expect(page.getByText('Tem certeza que deseja excluir?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();

  await expect(getByRoleSge(formulario, 'heading', { name: /Consulta de Cargos/i }))
    .toBeVisible({ timeout: 20000 });
  await pesquisarCargo(page, descricao);
  await expect(linhaCargo(page, descricao)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Cargo excluído e ausência conferida: ${descricao}`);
  return { descricao, url: page.url() };
}
