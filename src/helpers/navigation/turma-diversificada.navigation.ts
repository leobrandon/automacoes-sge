import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { navegarParaAdicionarTurma } from './turma.navigation';

/** Escola > Turma > Adicionar > Diversificada, pelos menus visíveis. */
export async function navegarParaAdicionarTurmaDiversificada(page: Page): Promise<void> {
  await navegarParaAdicionarTurma(page, 'Diversificada');
  const conteudo = page.locator('#main');
  await expect(getByRoleSge(conteudo, 'heading', { name: /Adicionar Turma Diversificada/i })).toBeVisible();
  await expect(conteudo.locator('#btnSubmitTurma')).toBeVisible();
}
