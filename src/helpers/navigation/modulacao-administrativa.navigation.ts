import {expect, type Locator, type Page} from '@playwright/test';
import {getByRoleSge} from '../sge-locators.helper';
import {waitForSgeLoaders} from './common.navigation';
import type {AlvoModulacaoAdministrativa} from '../../factories/modulacao-administrativa.factory';

const rota = '/modulacaocolaborador';
const tituloConsulta = 'Consulta de Modulações Administrativo';
const mensagemMenu = 'Menu "Modulação Escolar > Administrativo" não encontrado. Verifique se o parâmetro "Utiliza Modulação" está "Sim" no tenant e se o usuário tem permissão de consulta.';
const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export async function consultaModulacaoAdministrativa(page: Page): Promise<void> {
  const m = page.locator('#main');
  const titulo = m.locator('h4').filter({hasText: tituloConsulta});
  if (await titulo.isVisible()) return;
  await waitForSgeLoaders(page);
  const nav = page.locator('nav');
  const destino = nav.locator(`a[onclick*="'${rota}'"]`).filter({hasText: /^\s*Administrativo\s*$/});
  if (!await destino.isVisible()) {
    const pai = nav.locator('#menu-gestao > li > a').filter({has: page.locator('span.menu-item-parent').filter({hasText: /^\s*(Servidor|Colaborador)\s*$/})});
    if (await pai.count() !== 1) throw new Error(mensagemMenu);
    const grupo = nav.locator('a').filter({hasText: /^\s*Modulação Escolar\s*$/});
    if (!await grupo.isVisible()) await pai.click();
    if (!await destino.isVisible()) await grupo.click();
  }
  await expect(destino, mensagemMenu).toBeVisible();
  const [r] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase() === rota && x.request().method() === 'GET', {timeout: 30000}),
    destino.click(),
  ]);
  if (!r.ok()) throw new Error(`Consulta de modulações administrativas: HTTP ${r.status()}.`);
  await expect(titulo).toBeVisible();
  await waitForSgeLoaders(page);
}

export async function voltarParaConsultaModulacaoAdministrativa(page: Page): Promise<void> {
  await page.locator('#btnVoltar').click();
  await expect(page.locator('#main h4').filter({hasText: tituloConsulta})).toBeVisible();
  await waitForSgeLoaders(page);
}

export async function pesquisarModulacaoAdministrativa(page: Page, colaborador: string): Promise<void> {
  await consultaModulacaoAdministrativa(page);
  const m = page.locator('#main');
  await m.locator('#searchTerm').fill(colaborador);
  const [r] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase() === `${rota}/indexgrid` && x.request().method() === 'POST', {timeout: 30000}),
    m.locator('#btnSubmitSearch').click(),
  ]);
  if (!r.ok()) throw new Error(`Pesquisa de modulações retornou HTTP ${r.status()}.`);
  await waitForSgeLoaders(page);
}

/**
 * Pesquisa o servidor, expande servidor > matrícula > unidade e devolve as linhas de modulação
 * que batem com departamento, cargo, função e turno. Pode devolver 0 linhas (ex.: após excluir).
 */
export async function linhasModulacaoAdministrativa(page: Page, a: AlvoModulacaoAdministrativa): Promise<Locator> {
  await pesquisarModulacaoAdministrativa(page, a.colaborador);
  const m = page.locator('#main');
  const servidor = m.locator('table tbody tr').filter({has: page.locator('td.celula-servidor strong').filter({hasText: new RegExp(`^\\s*${escapar(a.colaborador)}\\s*$`, 'i')})});
  // Sem nenhuma modulação o servidor não aparece na grade ("Nenhuma modulação encontrada."): zero linhas.
  await expect(servidor.or(m.getByText('Nenhuma modulação encontrada.')).first()).toBeVisible();
  if (await servidor.count()) {
    await expect(servidor).toHaveCount(1);
    const [carregamento] = await Promise.all([
      page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase().endsWith('/obtenhalinhamodulacaocolaboradorindex'), {timeout: 30000}),
      servidor.locator('button.btnTreeview').click(),
    ]);
    if (!carregamento.ok()) throw new Error(`Carregamento das modulações do servidor: HTTP ${carregamento.status()}.`);
    const matricula = m.locator('li[role="treeitem"]').filter({has: page.locator('b').filter({hasText: new RegExp(`^\\s*Matrícula:\\s*${escapar(a.contrato)}\\s*$`)})});
    if (await matricula.count()) {
      await matricula.first().locator(':scope > span').click();
      const unidade = matricula.first().locator('li[role="treeitem"]').filter({has: page.locator('b').filter({hasText: new RegExp(`^\\s*${escapar(a.unidade)}`)})});
      if (await unidade.count()) await unidade.first().locator(':scope > span').click();
    }
  }
  const celula = (texto: string) => getByRoleSge(page, 'cell', {name: texto, exact: true});
  return m.locator('tr.linha-detalhe-row[data-modulacao-id]')
    .filter({has: celula(a.departamento)}).filter({has: celula(a.cargo)})
    // A grade mostra o turno por extenso (ex.: "Matutino/Manhã"); o filtro usa "Matutino".
    .filter({has: celula(a.funcao)}).filter({has: getByRoleSge(page, 'cell', {name: new RegExp(`^${escapar(a.turno)}(/|$)`)})});
}
