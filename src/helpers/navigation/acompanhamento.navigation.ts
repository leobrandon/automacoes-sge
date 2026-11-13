import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Acompanhamentos/i;
const ROTA = '/acompanhamento';

function main(page: Page): Locator {
  return page.locator('#main');
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function textoExato(texto: string): RegExp {
  return new RegExp(`^\\s*${escaparRegex(texto)}\\s*$`, 'i');
}

export function tituloConsultaAcompanhamento(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

/** Modal "Registrar acompanhamento" (2 passos: 1. Pauta, 2. Escola e registro). */
export function modalAberturaAcompanhamento(page: Page): Locator {
  return main(page).locator('#modalAberturaAcompanhamento');
}

/** Navega pelo menu visível Acompanhamento/Pautas > Acompanhamentos. */
export async function navegarParaConsultaAcompanhamento(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaAcompanhamento(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const modulo = nav.getByRole('link', { name: /Acompanhamento\/Pautas/ });
  const destino = nav.getByRole('link', { name: 'Acompanhamentos', exact: true });

  await expect(modulo).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible()) await modulo.click();
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Acompanhamentos retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

/** Abre o modal "Registrar acompanhamento" pelo botão Adicionar e espera o passo 1 ficar pronto. */
export async function abrirModalAdicionarAcompanhamento(page: Page): Promise<Locator> {
  await navegarParaConsultaAcompanhamento(page);
  const adicionar = getByRoleSge(main(page), 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  const modal = modalAberturaAcompanhamento(page);
  await expect(modal).toBeVisible({ timeout: 15000 });
  await modal.locator('#s2id_TipoDePautaId:not(.select2-container-disabled) .select2-choice')
    .waitFor({ state: 'visible', timeout: 15000 });
  return modal;
}

export async function voltarParaConsultaAcompanhamento(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(tituloConsultaAcompanhamento(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

export async function pesquisarAcompanhamento(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaAcompanhamento(page);
  const conteudo = main(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');
  const botaoPesquisar = conteudo.locator('#btnSubmitSearch');

  await expect(pesquisa).toBeVisible();
  await pesquisa.fill(termo);
  await expect(botaoPesquisar).toBeVisible();

  // A grade é substituída por inteiro após a resposta; marca a atual para só aceitar a nova tabela.
  await conteudo.locator('#grid table').evaluateAll((tabelas) => {
    tabelas.forEach((tabela) => tabela.setAttribute('data-grade-anterior', 'true'));
  });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase() === `${ROTA}/indexgrid` && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A pesquisa de Acompanhamentos retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/**
 * Linha da grade de uma combinação pauta + período + escola, que o SGE não deixa repetir. A pesquisa é por
 * trecho, então o nome da pauta é comparado inteiro (`Pauta 1` não pode casar `Pauta 10`).
 */
export function linhaAcompanhamento(page: Page, tipoPauta: string, periodo: string, escola: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.locator('strong').filter({ hasText: textoExato(tipoPauta) }) })
    .filter({ hasText: new RegExp(`Período:\\s*${escaparRegex(periodo)}(\\s|$)`, 'i') })
    .filter({ hasText: escola });
}

/** Aviso do SGE (SweetAlert) com botão `Ok`; o `Ok` fecha o diálogo antes de seguir. */
export async function confirmarAvisoAcompanhamento(page: Page): Promise<void> {
  const dialogo = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Ok', exact: true }) });
  await expect(dialogo).toBeVisible({ timeout: 15000 });
  await dialogo.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(dialogo).toBeHidden({ timeout: 15000 });
}
