import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { navegarParaAdicionarTurma } from './turma.navigation';

/** Escola > Turma > Adicionar > Alternativa, pelos menus visíveis. */
export async function navegarParaAdicionarTurmaAlternativa(page: Page): Promise<void> {
  await navegarParaAdicionarTurma(page, 'Alternativa');
  const conteudo = page.locator('#main');
  await expect(getByRoleSge(conteudo, 'heading', { name: /Adicionar Turma Alternativa/i })).toBeVisible();
  await expect(conteudo.locator('#btnSubmitTurma')).toBeVisible();
}
