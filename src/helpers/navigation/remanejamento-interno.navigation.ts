import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

// O nome acessível dos links do menu inclui glifos de ícone; o texto do rótulo fica num elemento próprio.
function linkMenu(page: Page, rotulo: string): Locator {
  return page.getByRole('link').filter({ has: page.getByText(rotulo, { exact: true }) });
}

/** Abre Aluno > Manutenção Matrícula e clica na opção informada, expandindo só o que ainda estiver fechado. */
async function abrirOpcaoManutencaoMatricula(page: Page, opcao: string, dica: string): Promise<void> {
  const item = linkMenu(page, opcao);
  if (!(await item.isVisible())) {
    const grupo = linkMenu(page, 'Manutenção Matrícula');
    if (!(await grupo.isVisible())) await linkMenu(page, 'Aluno').first().click();
    await expect(grupo, 'Menu "Manutenção Matrícula" ausente para este usuário.').toBeVisible();
    await grupo.click();
  }
  await expect(item, dica).toBeVisible();
  await item.click();
}

/** Aluno > Manutenção Matrícula > Remanejamento Interno (escola de origem; exige a permissão Remanejar). */
export async function navegarParaRemanejamentoInterno(page: Page): Promise<void> {
  await abrirOpcaoManutencaoMatricula(
    page,
    'Remanejamento Interno',
    'Opção "Remanejamento Interno" ausente: o perfil precisa da permissão Remanejar e não pode ser de Coordenadoria/DRE.',
  );
  await expect(page.locator('#content').getByText('Remanejamento de Alunos')).toBeVisible();
  await expect(page.locator('#SerieDeOrigemId')).toBeAttached();
  await waitForSgeLoaders(page);
}

/** Aluno > Manutenção Matrícula > Matricular alunos remanejados (escola de destino). */
export async function navegarParaMatricularAlunosRemanejados(page: Page): Promise<void> {
  await abrirOpcaoManutencaoMatricula(
    page,
    'Matricular alunos remanejados',
    'Opção "Matricular alunos remanejados" ausente para este usuário.',
  );
  await expect(getByRoleSge(page.locator('#main'), 'heading', { name: /Matricular alunos remanejados/i })).toBeVisible();
  await waitForSgeLoaders(page);
}
