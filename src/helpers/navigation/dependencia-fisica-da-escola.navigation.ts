import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildDependenciaFisicaDaEscola,
  type BuildDependenciaFisicaDaEscolaOptions,
} from '../../factories/dependencia-fisica-da-escola.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

// O título da consulta é o mesmo de "Dependência Física"; a coluna Quantidade distingue as duas telas.
const TITULO_CONSULTA = /Consulta de Dependência Física/i;
const ROTA = '/dependenciafisicadaescola';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function tituloConsultaDependenciaFisicaDaEscola(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

function colunaQuantidade(page: Page): Locator {
  return main(page).locator('#grid table thead').getByText('Quantidade', { exact: true });
}

/** Navega pelo menu visível Infraestrutura > Dependência Física da Escola. */
export async function navegarParaConsultaDependenciaFisicaDaEscola(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaDependenciaFisicaDaEscola(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible() && await colunaQuantidade(page).isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const infraestrutura = nav.getByRole('link', { name: /Infraestrutura/ }).first();
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemInfraestrutura = nav
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /Infraestrutura/ }) });
  const destino = itemInfraestrutura.getByRole('link', { name: 'Dependência Física da Escola', exact: true });

  await expect(infraestrutura).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible()) await infraestrutura.click();
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Dependência Física da Escola retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await expect(colunaQuantidade(page)).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarDependenciaFisicaDaEscola(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar Dependência Física da Escola/i });
  if (await formulario.isVisible()) {
    await conteudo.locator('#s2id_EscolaId').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaDependenciaFisicaDaEscola(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  await conteudo.locator('#s2id_EscolaId').waitFor({ state: 'visible', timeout: 15000 });
  await getByRoleSge(conteudo, 'button', { name: /Salvar/i }).waitFor({ state: 'visible', timeout: 15000 });
}

export async function voltarParaConsultaDependenciaFisicaDaEscola(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(tituloConsultaDependenciaFisicaDaEscola(page)).toBeVisible({ timeout: 20000 });
  await expect(colunaQuantidade(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

/**
 * Carrega a grade (até 100 registros por página) aberta pelo menu. A pesquisa por texto não localizou
 * Dependência nem Escola na homologação, e essa grade só lista vínculos com Ativo, Adequado a PCD e
 * Autorizado a Funcionar = Sim (a criação cadastra os três ligados).
 */
export async function carregarGradeDependenciaFisicaDaEscola(page: Page): Promise<void> {
  await navegarParaConsultaDependenciaFisicaDaEscola(page);
  const conteudo = main(page);
  const porPagina = conteudo.locator('#QuantidadeItensPorPagina_grid');
  // Sem registros a grade não renderiza o rodapé de paginação; a tabela já veio completa com a página.
  if (await conteudo.locator('#grid').getByText('<Nenhum resultado>').isVisible()) return;
  await expect(porPagina).toBeVisible({ timeout: 15000 });
  if (await porPagina.inputValue() === '100') return;

  // A grade é substituída por inteiro após a resposta; marca a atual para só aceitar a nova tabela.
  await conteudo.locator('#grid table').evaluateAll((tabelas) => {
    tabelas.forEach((tabela) => tabela.setAttribute('data-grade-anterior', 'true'));
  });
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase() === `${ROTA}/indexgrid` && url.searchParams.get('pageSize') === '100';
    }, { timeout: 20000 }),
    porPagina.selectOption('100'),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A grade de Dependência Física da Escola retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/**
 * Linha da grade da Dependência Física exata `dependenciaFisica` na escola `escola` (a coluna Escola
 * exibe "NOME - código"). A dupla escola + dependência é única no SGE.
 */
export function linhaDependenciaFisicaDaEscola(page: Page, dependenciaFisica: string, escola: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByText(dependenciaFisica, { exact: true }) })
    .filter({ hasText: new RegExp(`${escapar(escola)}\\s*-\\s*\\d+`, 'i') });
}

/** Abre a edição clicando na dependência da linha (a grade não tem lixeira nem botão de editar). */
export async function abrirEdicaoDependenciaFisicaDaEscola(
  page: Page,
  dependenciaFisica: string,
  escola: string,
): Promise<void> {
  const conteudo = main(page);
  const linha = linhaDependenciaFisicaDaEscola(page, dependenciaFisica, escola);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByText(dependenciaFisica, { exact: true }).click();

  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar Dependência Física da Escola/i }))
    .toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#s2id_DependenciaFisicaId .select2-chosen'))
    .toHaveText(dependenciaFisica, { timeout: 15000 });
  await expect(conteudo.locator('#s2id_CondicaoDeUso:not(.select2-container-disabled)')).toBeVisible();
}

/**
 * Menor sequência >= `inicio` cuja Dependência Física ainda não está vinculada à escola. O SGE recusa
 * o vínculo repetido; nada é excluído aqui.
 */
export async function proximaSequenciaLivreDependenciaFisicaDaEscola(
  page: Page,
  options: BuildDependenciaFisicaDaEscolaOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { dependenciaFisica, escola } = buildDependenciaFisicaDaEscola(options, sequencia);
    await carregarGradeDependenciaFisicaDaEscola(page);
    if (await linhaDependenciaFisicaDaEscola(page, dependenciaFisica, escola).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos registros QAAUTO de Dependência Física da Escola.',
  );
}

export async function confirmarExclusaoDependenciaFisicaDaEscola(page: Page): Promise<void> {
  await expect(page.getByText('Tem certeza que deseja excluir?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
}
