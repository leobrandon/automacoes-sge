import { expect, type Locator, type Page } from '@playwright/test';
import { buildSalaDeAula, type BuildSalaDeAulaOptions } from '../../factories/sala-de-aula.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Salas de Aula/i;
const ROTA = '/sala';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function tituloConsultaSalaDeAula(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

/** Navega pelo menu visível Infraestrutura > Sala de Aula. */
export async function navegarParaConsultaSalaDeAula(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaSalaDeAula(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const infraestrutura = nav.getByRole('link', { name: /Infraestrutura/ }).first();
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemInfraestrutura = nav
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /Infraestrutura/ }) });
  const destino = itemInfraestrutura.getByRole('link', { name: 'Sala de Aula', exact: true });

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
    throw new Error(`A consulta de Salas de Aula retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarSalaDeAula(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar Sala de Aula/i });
  if (await formulario.isVisible()) {
    await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaSalaDeAula(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
  await getByRoleSge(conteudo, 'button', { name: /Salvar/i }).waitFor({ state: 'visible', timeout: 15000 });
}

export async function voltarParaConsultaSalaDeAula(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(tituloConsultaSalaDeAula(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

export async function pesquisarSalaDeAula(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaSalaDeAula(page);
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
    throw new Error(`A pesquisa de Salas de Aula retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/**
 * Linha da grade da sala de descrição exata `descricao` na escola `escola` (a pesquisa é por trecho da
 * descrição e a coluna Escola exibe "NOME - código").
 */
export function linhaSalaDeAula(page: Page, descricao: string, escola: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByText(descricao, { exact: true }) })
    .filter({ hasText: new RegExp(`${escapar(escola)}\\s*-\\s*\\d+`, 'i') });
}

/** Abre a edição clicando na descrição da linha (a grade não tem lixeira nem botão de editar). */
export async function abrirEdicaoSalaDeAula(page: Page, descricao: string, escola: string): Promise<void> {
  const conteudo = main(page);
  const linha = linhaSalaDeAula(page, descricao, escola);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByText(descricao, { exact: true }).click();

  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar Sala de Aula/i })).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#Descricao')).toHaveValue(descricao, { timeout: 15000 });
  await expect(conteudo.locator('#s2id_ListaClimatizacao')).toBeVisible();
}

/**
 * Menor sequência >= `inicio` cuja descrição ainda não existe. O SGE recusa descrição repetida
 * ("Já existe um registro cadastrado com esta descrição."); nada é excluído aqui.
 */
export async function proximaSequenciaLivreSalaDeAula(
  page: Page,
  options: BuildSalaDeAulaOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { descricao, escola } = buildSalaDeAula(options, sequencia);
    await pesquisarSalaDeAula(page, descricao);
    if (await linhaSalaDeAula(page, descricao, escola).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos registros QAAUTO de Sala de Aula.',
  );
}

export async function confirmarExclusaoSalaDeAula(page: Page): Promise<void> {
  await expect(page.getByText('Tem certeza que deseja excluir?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
}
