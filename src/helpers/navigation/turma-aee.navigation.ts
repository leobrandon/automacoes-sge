import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';
import {
  celulaDescricaoTurma,
  linhaTurma,
  navegarParaAdicionarTurma,
  navegarParaConsultaTurmas,
  pesquisarTurma,
} from './turma.navigation';

function main(page: Page): Locator {
  return page.locator('#main');
}

export async function navegarParaConsultaTurmaAee(page: Page): Promise<void> {
  await navegarParaConsultaTurmas(page);
  const conteudo = main(page);
  await expect(getByRoleSge(conteudo, 'heading', { name: /Consulta de Turmas/i })).toBeVisible();
  await expect(conteudo.locator('#searchTerm')).toBeVisible();
  await waitForSgeLoaders(page);
}

export async function navegarParaAdicionarTurmaAee(page: Page): Promise<void> {
  await navegarParaAdicionarTurma(page, 'AEE');
  await expect(getByRoleSge(main(page), 'heading', { name: /Criar Turma de AEE/i })).toBeVisible();
  await expect(main(page).locator('#formCreateTurmaAEE')).toBeVisible();
}

export async function pesquisarTurmaAee(page: Page, termo: string): Promise<void> {
  await pesquisarTurma(page, termo);
}

export function linhaTurmaAee(page: Page, descricao: string): Locator {
  return linhaTurma(page, descricao);
}

export function celulaDescricaoTurmaAee(linha: Locator, descricao: string): Locator {
  return celulaDescricaoTurma(linha, descricao);
}
