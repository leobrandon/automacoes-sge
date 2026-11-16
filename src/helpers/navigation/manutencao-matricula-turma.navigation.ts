import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

/** Aluno > Manutenção Matrícula > Manutenção matrícula por turma (só aparece no perfil de unidade escolar). */
export async function navegarParaManutencaoMatriculaTurma(page: Page): Promise<void> {
  const titulo = getByRoleSge(page.locator('#main'), 'heading', { name: /Manutenção matrícula por turma/i });
  // O nome acessível dos links do menu inclui glifos de ícone; o texto do rótulo fica num elemento próprio.
  const linkMenu = (rotulo: string): Locator => page.getByRole('link').filter({ has: page.getByText(rotulo, { exact: true }) });
  const item = linkMenu('Manutenção matrícula por turma');
  if (!(await item.isVisible())) {
    const grupo = linkMenu('Manutenção Matrícula');
    if (!(await grupo.isVisible())) await linkMenu('Aluno').first().click();
    await expect(grupo, 'Menu "Manutenção Matrícula" ausente: use um usuário de unidade escolar com a permissão ManutencaoMatriculaTurma.').toBeVisible();
    await grupo.click();
  }
  await expect(item, 'Opção "Manutenção matrícula por turma" ausente: o perfil precisa da permissão ManutencaoMatriculaTurma e não pode ser de Coordenadoria/DRE.').toBeVisible();
  await item.click();
  await expect(titulo).toBeVisible();
  await expect(page.locator('#TurmaId')).toBeAttached();
  await waitForSgeLoaders(page);
}

export function formularioManutencaoMatricula(page: Page): Locator {
  return page.locator('#content');
}
