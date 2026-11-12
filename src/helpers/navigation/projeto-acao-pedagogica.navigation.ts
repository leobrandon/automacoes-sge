import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { select2 } from '../select2.helper';
import type { ProjetoPedagogicoDados } from '../../factories/projeto-acao-pedagogica.factory';

export async function selecionarUnidadeProjeto(
  page: Page,
  d: ProjetoPedagogicoDados,
): Promise<void> {
  const unidade = page.locator('header').getByText('Unidade Escolar', { exact: true });
  if (await unidade.isVisible()) {
    await expect(page.getByTitle('Unidade logada')).toHaveText(d.escola);
    await expect(page.getByTitle('Secretaria logada')).toHaveText(d.tenant);
    return;
  }
  const perfil = page
    .locator('header .project-selector')
    .filter({ hasText: /Secretaria de Educação/ });
  await expect(perfil).toBeVisible();
  await perfil.click();
  const voltarAdmin = page.locator('#btnBackAdmin');
  if ((await voltarAdmin.count()) === 0)
    throw new Error(
      'A conta autenticada não disponibiliza retorno à visão de administrador para selecionar a unidade escolar. Configure acesso autorizado à unidade para executar este módulo.',
    );
  await expect(voltarAdmin).toBeVisible();
  await voltarAdmin.click();
  const dialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Deseja realmente retornar para a visão de administrador do sistema?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Sim', exact: true }).click();
  await expect(
    page.locator('header').getByText('Administrador de Sistema', { exact: true }),
  ).toBeVisible();
  const nav = page.locator('nav');
  await nav
    .locator('a')
    .filter({ hasText: /^\s*Cadastro\s*$/ })
    .click();
  await nav
    .locator('a')
    .filter({ hasText: /^\s*Unidade\s*$/ })
    .click();
  const main = page.locator('#main');
  await expect(main.locator('h4').filter({ hasText: 'Escolas' })).toBeVisible();
  await main.locator('#searchTerm').fill(d.escola);
  await main.locator('#btnSubmitSearch').click();
  const linha = main
    .locator('table tbody tr:visible')
    .filter({ has: getByRoleSge(page, 'cell', { name: d.escola, exact: true }) })
    .filter({ has: getByRoleSge(page, 'cell', { name: d.tenant, exact: true }) });
  await expect(linha).toHaveCount(1);
  await linha.getByTitle('Autenticar Unidade').click();
  await expect(page.locator('header').getByText('Unidade Escolar', { exact: true })).toBeVisible();
  await expect(page.getByTitle('Unidade logada')).toHaveText(d.escola);
}
export async function consultaProjeto(page: Page): Promise<void> {
  const m = page.locator('#main');
  if (await m.locator('h4').filter({ hasText: 'Projetos e Ações Pedagógicas' }).isVisible()) return;
  const n = page.locator('nav'),
    p = n.locator('a[title="Alimentação escolar"]'),
    d = n.locator('a').filter({ hasText: /^\s*Projetos e Ações Pedagógicas\s*$/ });
  if (!(await d.isVisible())) await p.click();
  const [r] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.toLowerCase() === '/projetoeacaopedagogica' &&
        r.request().method() === 'GET',
    ),
    d.click(),
  ]);
  if (!r.ok()) throw new Error(`Consulta de projetos: HTTP ${r.status()}.`);
  await expect(m.locator('h4').filter({ hasText: 'Projetos e Ações Pedagógicas' })).toBeVisible();
}
export async function pesquisarProjeto(page: Page, d: ProjetoPedagogicoDados): Promise<void> {
  await consultaProjeto(page);
  await select2.select(page, '#AnoLetivo', d.anoLetivo, { exactMatch: true });
  await select2.select(page, '#Periodo', d.periodo, { exactMatch: true });
  const [r] = await Promise.all([
    page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname.toLowerCase() === '/projetoeacaopedagogica/indexgrid' &&
        r.request().method() === 'GET',
    ),
    page.locator('#main #btnSubmitSearch').click(),
  ]);
  if (!r.ok()) throw new Error(`Pesquisa de projetos: HTTP ${r.status()}.`);
}
export function linhaProjeto(page: Page, d: ProjetoPedagogicoDados) {
  return page
    .locator('#main table tbody tr:visible')
    .filter({
      has: getByRoleSge(page, 'cell', {
        name: new RegExp(`^${d.escola.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*-`),
        exact: false,
      }),
    })
    .filter({ has: getByRoleSge(page, 'cell', { name: d.anoLetivo, exact: true }) })
    .filter({ has: getByRoleSge(page, 'cell', { name: d.periodo, exact: true }) });
}
