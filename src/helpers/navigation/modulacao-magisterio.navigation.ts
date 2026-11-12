import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';
import type { AtribuicaoMagisterio } from '../../factories/modulacao-magisterio.factory';
const mensagemMenu = 'Menu "Modulação Escolar > Magistério" não encontrado. Verifique se o parâmetro "Utiliza Modulação" está "Sim" no tenant e se o usuário tem permissão de consulta.';
const resposta = (p: string) => (r: import('@playwright/test').Response) => new URL(r.url()).pathname.toLowerCase() === p && r.ok();
export async function navegarParaConsultaModulacaoMagisterio(page: Page): Promise<void> {
    const main = page.locator('#main');
    if (await main.locator('h4').filter({ hasText: 'Consulta de Modulações Magistério' }).isVisible())
        return;
    await waitForSgeLoaders(page);
    const nav = page.locator('nav');
    const pai = nav.locator('#menu-gestao > li > a').filter({ has: page.locator('span.menu-item-parent').filter({ hasText: /^\s*(Servidor|Colaborador)\s*$/ }) });
    if (await pai.count() !== 1)
        throw new Error(mensagemMenu);
    const grupo = nav.locator('a').filter({ hasText: /^\s*Modulação Escolar\s*$/ });
    if (!await grupo.isVisible())
        await pai.click();
    if (!await grupo.isVisible())
        throw new Error(mensagemMenu);
    const item = nav.locator('li').filter({ has: page.locator('a').filter({ hasText: /^\s*Modulação Escolar\s*$/ }) }).locator(':scope > ul > li > a').filter({ hasText: /^\s*Magistério\s*$/ });
    if (!await item.isVisible())
        await grupo.click();
    await expect(item, mensagemMenu).toBeVisible();
    await Promise.all([page.waitForResponse(resposta('/modulacaoprofessor')), item.click()]);
    await expect(main.locator('h4').filter({ hasText: 'Consulta de Modulações Magistério' })).toBeVisible();
    await waitForSgeLoaders(page);
}
export async function navegarParaAdicionarModulacaoMagisterio(page: Page): Promise<void> {
    await navegarParaConsultaModulacaoMagisterio(page);
    const m = page.locator('#main');
    await Promise.all([page.waitForResponse(resposta('/modulacaoprofessor/editar')), getByRoleSge(m, 'button', { name: /Adicionar/ }).click()]);
    await expect(m.locator('h4').filter({ hasText: 'Adicionar Modulação Magistério' })).toBeVisible();
    await waitForSgeLoaders(page);
}
export async function voltarConsultaMagisterio(page: Page): Promise<void> {
    await Promise.all([page.waitForResponse(r => /\/modulacaoprofessor(?:\/index)?$/i.test(new URL(r.url()).pathname) && r.ok()), getByRoleSge(page.locator('#main'), 'button', { name: /Voltar/ }).click()]);
    await expect(page.locator('#main h4').filter({ hasText: 'Consulta de Modulações Magistério' })).toBeVisible();
}
export async function pesquisarMagisterio(page: Page, colaborador: string): Promise<void> {
    await navegarParaConsultaModulacaoMagisterio(page);
    await page.locator('#main #searchTerm').fill(colaborador);
    await Promise.all([page.waitForResponse(resposta('/modulacaoprofessor/indexgrid')), page.locator('#main #btnSubmitSearch').click()]);
    await waitForSgeLoaders(page);
}
export async function localizarAtribuicao(page: Page, d: AtribuicaoMagisterio): Promise<Locator> {
    await pesquisarMagisterio(page, d.colaborador);
    const grid = page.locator('#grid');
    const professor = grid.locator('tbody > tr').filter({ has: getByRoleSge(page, 'cell', { name: d.colaborador, exact: true }) });
    await expect(professor).toHaveCount(1);
    await Promise.all([page.waitForResponse(r => new URL(r.url()).pathname.toLowerCase().endsWith('/obtenhalinhamodulacaocolaboradorindex') && r.ok()), professor.getByRole('button', { includeHidden: true }).click()]);
    const contrato = grid.locator('li[role="treeitem"]').filter({ has: page.locator('b').filter({ hasText: new RegExp(`^\\s*Matrícula:\\s*${d.contrato.split(' ')[0]}\\s*$`) }) });
    await expect(contrato).toHaveCount(1);
    await contrato.locator(':scope > span').click();
    const escola = contrato.locator('li[role="treeitem"]').filter({ has: page.locator('b').filter({ hasText: new RegExp(`^\\s*${d.escola.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`) }) });
    await expect(escola).toHaveCount(1);
    await escola.locator(':scope > span').click();
    const linha = escola.locator('table tbody tr').filter({ has: getByRoleSge(page, 'cell', { name: d.turma, exact: true }) }).filter({ has: getByRoleSge(page, 'cell', { name: d.componente, exact: true }) });
    return linha;
}
export async function confirmarMagisterio(page: Page, texto: RegExp): Promise<void> {
    const d = page.getByRole('dialog').filter({ hasText: texto });
    await expect(d).toBeVisible();
    await d.getByRole('button', { name: 'Ok', exact: true }).click();
    await expect(d).toBeHidden();
}
