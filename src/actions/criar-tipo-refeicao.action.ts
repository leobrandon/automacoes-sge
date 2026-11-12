import { expect, type Page } from '@playwright/test';
import { buildTipoRefeicao } from '../factories/tipo-refeicao.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  avisoTipoRefeicao,
  consultaTipoRefeicao,
  linhaTipoRefeicao,
  pesquisarTipoRefeicao,
} from '../helpers/navigation/tipo-refeicao.navigation';
export async function criarTipoRefeicao(page: Page, base = '', sequencia = 1): Promise<string> {
  const nome = buildTipoRefeicao(base, sequencia),
    m = page.locator('#main');
  await consultaTipoRefeicao(page);
  const adicionar = getByRoleSge(m, 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await expect(m.locator('h4').filter({ hasText: 'Adicionar Tipo de Refeição' })).toBeVisible();
  await m.locator('#Nome').fill(nome);
  const salvar = getByRoleSge(m, 'button', { name: /Salvar/ });
  await expect(salvar).toBeVisible();
  await salvar.click();
  await avisoTipoRefeicao(page, /Tipo de refeição adicionado\./i);
  const voltar = getByRoleSge(m, 'button', { name: /Voltar/ });
  await expect(voltar).toBeVisible();
  await voltar.click();
  await expect(m.locator('h4').filter({ hasText: 'Tipos de Refeição' })).toBeVisible();
  await pesquisarTipoRefeicao(page, nome);
  await expect(linhaTipoRefeicao(page, nome)).toHaveCount(1);
  return nome;
}
