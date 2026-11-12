import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

function main(page: Page): Locator {
  return page.locator('#main');
}

export function linhaEscalaProficiencia(page: Page, codigo: string): Locator {
  return main(page)
    .locator('table tbody tr:visible')
    .filter({ has: getByRoleSge(page, 'cell', { name: codigo, exact: true }) });
}

export async function navegarParaConsultaEscalaProficiencia(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = getByRoleSge(conteudo, 'heading', { name: /Consulta Escala de Proficiência/i });
  if (await titulo.isVisible()) {
    await conteudo.locator('#searchTerm:visible').waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const configuracoes = nav.getByRole('link', { name: /Configurações/ }).first();
  const itemConfiguracoes = nav
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /Configurações/ }) });
  const escala = itemConfiguracoes.getByRole('link', { name: 'Escala de Proficiência', exact: true });

  await expect(configuracoes).toBeVisible({ timeout: 15000 });
  if (!await escala.isVisible()) await configuracoes.click();
  await expect(escala).toBeVisible({ timeout: 15000 });
  await escala.click();

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await conteudo.locator('#searchTerm:visible').waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarEscalaProficiencia(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = getByRoleSge(conteudo, 'heading', { name: /Adicionar Escala de Proficiência/i });
  if (await titulo.isVisible()) return;

  await navegarParaConsultaEscalaProficiencia(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await expect(titulo).toBeVisible({ timeout: 15000 });
  await expect(conteudo.locator('#Codigo')).toBeVisible();
  await expect(conteudo.locator('#Descricao')).toBeVisible();
}

export async function pesquisarEscalaProficiencia(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaEscalaProficiencia(page);
  const conteudo = main(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');
  const buscar = conteudo.locator('#btnSubmitSearch:visible');
  await pesquisa.fill(termo);
  await expect(buscar).toBeVisible();
  await buscar.click();
  await waitForSgeLoaders(page);

  const linhas = conteudo.locator('table tbody tr:visible').filter({ hasNotText: '<Nenhum resultado>' });
  const vazio = getByRoleSge(conteudo, 'cell', { name: '<Nenhum resultado>', exact: true });
  await expect(linhas.first().or(vazio)).toBeVisible({ timeout: 20000 });
}

export async function abrirEdicaoEscalaProficiencia(page: Page, codigo: string): Promise<void> {
  await pesquisarEscalaProficiencia(page, codigo);
  const linha = linhaEscalaProficiencia(page, codigo);
  await expect(linha).toHaveCount(1);
  const celulaCodigo = linha.getByRole('cell', { name: codigo, exact: true });
  const linkCodigo = celulaCodigo.getByRole('link').first();
  if (await linkCodigo.count()) await linkCodigo.click();
  else await celulaCodigo.click();
  await expect(getByRoleSge(main(page), 'heading', { name: /Editar Escala de Proficiência/i }))
    .toBeVisible({ timeout: 20000 });
}
