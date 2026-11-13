import { expect, type Locator, type Page } from '@playwright/test';
import { buildPatrimonio, type BuildPatrimonioOptions } from '../../factories/patrimonio.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Patrimônio/i;
const ROTA = '/patrimonio';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaPatrimonio(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

/** Navega pelo menu visível Patrimônio > Patrimônio. */
export async function navegarParaConsultaPatrimonio(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaPatrimonio(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  // O submenu também se chama "Patrimônio"; o primeiro link na ordem do DOM é o do módulo.
  const modulo = nav.getByRole('link', { name: /Patrimônio/ }).first();
  const destino = nav.getByRole('link', { name: 'Patrimônio', exact: true });

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
    throw new Error(`A consulta de Patrimônio retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarPatrimonio(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar Patrimônio/i });
  if (await formulario.isVisible()) {
    await conteudo.locator('#btnSalvar').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaPatrimonio(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  // O SGE mostra o formulário antes de inicializar os Select2; o primeiro precisa estar pronto.
  await conteudo.locator('#s2id_EscolaId:not(.select2-container-disabled) .select2-choice')
    .waitFor({ state: 'visible', timeout: 15000 });
  await conteudo.locator('#btnSalvar').waitFor({ state: 'visible', timeout: 15000 });
}

export async function voltarParaConsultaPatrimonio(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(tituloConsultaPatrimonio(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

export async function pesquisarPatrimonio(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaPatrimonio(page);
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
      return url.pathname.toLowerCase() === `${ROTA}/indexgrid` && response.request().method() === 'POST';
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A pesquisa de Patrimônio retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Linha da grade cuja placa é exatamente `placa` (a pesquisa é por trecho e também olha a série). */
export function linhaPatrimonio(page: Page, placa: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByRole('cell', { name: placa, exact: true }) });
}

/** Abre a edição clicando na placa da linha (a grade não tem lixeira nem botão de editar). */
export async function abrirEdicaoPatrimonio(page: Page, placa: string): Promise<void> {
  const conteudo = main(page);
  const linha = linhaPatrimonio(page, placa);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByRole('cell', { name: placa, exact: true }).click();

  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar Patrimônio/i })).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#Placa')).toHaveValue(placa, { timeout: 15000 });
}

/**
 * Menor sequência >= `inicio` cuja placa ainda não existe na consulta. O SGE recusa placa repetida
 * ("Placa já cadastrada no sistema."), então a placa é a chave de conferência e de exclusão.
 */
export async function proximaSequenciaLivrePatrimonio(
  page: Page,
  options: BuildPatrimonioOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { placa } = buildPatrimonio(options, sequencia);
    await pesquisarPatrimonio(page, placa);
    if (await linhaPatrimonio(page, placa).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos Patrimônios QAAUTO criados por execuções anteriores.',
  );
}

/** Aviso do SGE (SweetAlert) com botão `Ok` ou `Sim`; o `Ok` fecha o diálogo antes de seguir. */
export async function confirmarAvisoPatrimonio(page: Page, nomeBotao: 'Sim' | 'Ok'): Promise<void> {
  const dialogo = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: nomeBotao, exact: true }) });
  await expect(dialogo).toBeVisible({ timeout: 15000 });
  await dialogo.getByRole('button', { name: nomeBotao, exact: true }).click();
  if (nomeBotao === 'Ok') await expect(dialogo).toBeHidden({ timeout: 15000 });
}
