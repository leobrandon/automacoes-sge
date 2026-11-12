import {expect, type Locator, type Page} from '@playwright/test';
import {waitForSgeLoaders} from './common.navigation';
import type {AlvoDiretrizAdministrativa} from '../../factories/diretriz-administrativa.factory';

const rota = '/diretriz';
const tituloConsulta = 'Consulta de Diretrizes';
const mensagemMenu = 'Menu "Colaborador > Diretriz Escolar > Administrativo" não encontrado. Verifique se o usuário tem permissão de consulta.';
const escapar = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Colunas da grade (1-based): 1 url oculta, 2 Ano, 3 Função, 4 Cargo, 5 Unidade, 6 Turno, 7 Horas, 8 Vagas, 9 Moduladas, 10 Disponíveis.
export const colunaDiretriz = {funcao: 3, cargo: 4, unidade: 5, turno: 6, horas: 7, vagas: 8, moduladas: 9} as const;

export async function consultaDiretrizAdministrativa(page: Page): Promise<void> {
  const m = page.locator('#main');
  const titulo = m.locator('h4').filter({hasText: tituloConsulta});
  if (await titulo.isVisible()) return;
  await waitForSgeLoaders(page);
  const nav = page.locator('nav');
  const destino = nav.locator(`a[onclick*="'${rota}'"]`).filter({hasText: /^\s*Administrativo\s*$/});
  if (!await destino.isVisible()) {
    const pai = nav.locator('#menu-gestao > li > a').filter({has: page.locator('span.menu-item-parent').filter({hasText: /^\s*(Servidor|Colaborador)\s*$/})});
    if (await pai.count() !== 1) throw new Error(mensagemMenu);
    const grupo = nav.locator('a').filter({hasText: /^\s*Diretriz Escolar\s*$/});
    if (!await grupo.isVisible()) await pai.click();
    if (!await destino.isVisible()) await grupo.click();
  }
  await expect(destino, mensagemMenu).toBeVisible();
  const [r] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase() === rota && x.request().method() === 'GET', {timeout: 30000}),
    destino.click(),
  ]);
  if (!r.ok()) throw new Error(`Consulta de diretrizes: HTTP ${r.status()}.`);
  await expect(titulo).toBeVisible();
  await waitForSgeLoaders(page);
}

export async function voltarParaConsultaDiretrizAdministrativa(page: Page): Promise<void> {
  await page.locator('#main button').filter({hasText: 'Voltar'}).click();
  await expect(page.locator('#main h4').filter({hasText: tituloConsulta})).toBeVisible();
  await waitForSgeLoaders(page);
}

/**
 * Abre a consulta, exibe até 100 itens por página e devolve as linhas da grade
 * que batem com unidade, função, cargo e turno (e, com `exato`, horas e vagas).
 * Pode devolver 0 linhas (ex.: após excluir).
 */
export async function linhasDiretrizAdministrativa(page: Page, a: AlvoDiretrizAdministrativa, exato = true): Promise<Locator> {
  await consultaDiretrizAdministrativa(page);
  const m = page.locator('#main');
  const [grid] = await Promise.all([
    page.waitForResponse(x => new URL(x.url()).pathname.toLowerCase() === `${rota}/indexgrid` && x.request().method() === 'GET', {timeout: 30000}),
    m.locator('#QuantidadeItensPorPagina_grid').selectOption('100'),
  ]);
  if (!grid.ok()) throw new Error(`Grade de diretrizes: HTTP ${grid.status()}.`);
  await waitForSgeLoaders(page);
  const linhas = m.locator('table tbody tr');
  await expect(linhas.first()).toBeVisible();
  const celula = (coluna: number, texto: RegExp) => page.locator(`td:nth-child(${coluna})`).filter({hasText: texto});
  const exatoTexto = (t: string) => new RegExp(`^\\s*${escapar(t)}\\s*$`);
  let r = linhas
    .filter({has: celula(colunaDiretriz.funcao, exatoTexto(a.funcao))})
    .filter({has: celula(colunaDiretriz.cargo, exatoTexto(a.cargo))})
    .filter({has: celula(colunaDiretriz.unidade, exatoTexto(a.unidade))})
    // A grade mostra o turno por extenso (ex.: "Vespertino/Tarde"); o dado usa "Vespertino".
    .filter({has: celula(colunaDiretriz.turno, new RegExp(`^\\s*${escapar(a.turno)}(/|\\s*$)`))});
  if (exato) {
    r = r.filter({has: celula(colunaDiretriz.horas, exatoTexto(a.horasSemanais))}).filter({has: celula(colunaDiretriz.vagas, exatoTexto(a.vagas))});
  }
  return r;
}
