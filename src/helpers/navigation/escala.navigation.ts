import { expect, type Locator, type Page } from '@playwright/test';
import { LETRAS_SUFIXO_ESCALA } from '../../factories/escala.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA_ESCALA = /Consulta de Escalas/i;

function main(page: Page): Locator {
  return page.locator('#main');
}

/** Navega pelo menu visível Cadastro > Ponto > Escalas. */
export async function navegarParaConsultaEscala(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = getByRoleSge(conteudo, 'heading', { name: TITULO_CONSULTA_ESCALA });
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
  const escalas = itemPonto.getByRole('link', { name: 'Escalas', exact: true });

  await expect(cadastro).toBeVisible({ timeout: 15000 });
  if (!await ponto.isVisible()) await cadastro.click();
  await expect(ponto).toBeVisible({ timeout: 15000 });
  if (!await escalas.isVisible()) await ponto.click();
  await expect(escalas).toBeVisible({ timeout: 15000 });
  await escalas.click();

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarEscala(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar Escala/i });
  if (await formulario.isVisible()) {
    await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaEscala(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
  await getByRoleSge(conteudo, 'button', { name: /Salvar/i }).waitFor({ state: 'visible', timeout: 15000 });
}

export async function voltarParaConsultaEscala(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(getByRoleSge(conteudo, 'heading', { name: TITULO_CONSULTA_ESCALA }))
    .toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

export async function pesquisarEscala(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaEscala(page);
  const conteudo = main(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');
  const botaoPesquisar = conteudo.locator('#searchForm button[type="submit"]:visible');

  await expect(pesquisa).toBeVisible();
  await pesquisa.fill(termo);
  await expect(botaoPesquisar).toBeVisible();

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR') === '/pontoescala/indexgrid';
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Escalas retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
}

/** Consulta A, B, C... e devolve a primeira letra cujo sufixo ainda não existe na consulta. */
export async function proximaLetraEscala(page: Page, prefixo: string): Promise<string> {
  for (const letra of LETRAS_SUFIXO_ESCALA) {
    const descricao = `${prefixo} ${letra}`;
    await pesquisarEscala(page, descricao);
    if (await linhaEscala(page, descricao).count() === 0) return letra;
  }
  throw new Error(`Todas as letras A-Z já foram usadas para "${prefixo}".`);
}

export function linhaEscala(page: Page, descricao: string): Locator {
  return main(page).getByText(descricao, { exact: true }).locator('xpath=ancestor::tr[1]');
}
