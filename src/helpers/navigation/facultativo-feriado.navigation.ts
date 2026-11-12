import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildFacultativoFeriado,
  type BuildFacultativoFeriadoOptions,
} from '../../factories/facultativo-feriado.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Feriados\/Facultativo/i;
const ROTA = '/pontoferiado';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaFacultativoFeriado(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

/** Navega pelo menu visível Cadastro > Ponto > Facultativo e Feriados. */
export async function navegarParaConsultaFacultativoFeriado(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaFacultativoFeriado(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const cadastro = nav.getByRole('link', { name: /Cadastro/ }).first();
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemCadastro = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /Cadastro/ }) });
  const ponto = itemCadastro.getByRole('link', { name: /^Ponto\b/ }).first();
  const itemPonto = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /^Ponto\b/ }) });
  const destino = itemPonto.getByRole('link', { name: 'Facultativo e Feriados', exact: true });

  await expect(cadastro).toBeVisible({ timeout: 15000 });
  if (!await ponto.isVisible()) await cadastro.click();
  await expect(ponto).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible()) await ponto.click();
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Feriados/Facultativo retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarFacultativoFeriado(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar Feriado\/Facultativo/i });
  if (await formulario.isVisible()) {
    await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaFacultativoFeriado(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
  await conteudo.locator('#Data').waitFor({ state: 'visible', timeout: 15000 });
  await getByRoleSge(conteudo, 'button', { name: /Salvar/i }).waitFor({ state: 'visible', timeout: 15000 });
}

export async function voltarParaConsultaFacultativoFeriado(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(tituloConsultaFacultativoFeriado(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

export async function pesquisarFacultativoFeriado(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaFacultativoFeriado(page);
  const conteudo = main(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');
  const botaoPesquisar = conteudo.locator('#searchForm button[type="submit"]:visible');

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
    throw new Error(`A pesquisa de Feriados/Facultativo retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Linha da grade cuja descrição é exatamente `descricao` (a pesquisa é por trecho). */
export function linhaFacultativoFeriado(page: Page, descricao: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByText(descricao, { exact: true }) });
}

/** Abre a edição clicando na descrição da linha (a grade não tem lixeira nem botão de editar). */
export async function abrirEdicaoFacultativoFeriado(page: Page, descricao: string): Promise<void> {
  const conteudo = main(page);
  const linha = linhaFacultativoFeriado(page, descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByText(descricao, { exact: true }).click();

  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar Feriado\/Facultativo/i }))
    .toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#Descricao')).toHaveValue(descricao, { timeout: 15000 });
}

/**
 * Menor sequência >= `inicio` cuja descrição ainda não existe na consulta. O SGE rejeita descrição
 * repetida e os registros QAAUTO de execuções anteriores permanecem; nada é excluído aqui.
 */
export async function proximaSequenciaLivreFacultativoFeriado(
  page: Page,
  options: BuildFacultativoFeriadoOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { descricao } = buildFacultativoFeriado(options, sequencia);
    await pesquisarFacultativoFeriado(page, descricao);
    if (await linhaFacultativoFeriado(page, descricao).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos registros QAAUTO de Feriados/Facultativo.',
  );
}

export async function confirmarExclusaoFacultativoFeriado(page: Page): Promise<void> {
  await expect(page.getByText('Tem certeza que deseja excluir?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
}
