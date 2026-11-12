import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA_CARGO = /Consulta de Cargos/i;

function main(page: Page): Locator {
  return page.locator('#main');
}

/** Navega pelo menu visível Cadastro > Servidor (ou Colaborador) > Cargo. */
export async function navegarParaConsultaCargo(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = getByRoleSge(conteudo, 'heading', { name: TITULO_CONSULTA_CARGO });
  const tabela = conteudo.locator('table:visible');
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await tabela.waitFor({ state: 'visible', timeout: 20000 });
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const cadastro = nav.getByRole('link', { name: /Cadastro/ }).first();
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemCadastro = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /Cadastro/ }) });
  // O submenu se chama "Servidor" no sandbox e "Colaborador" na homologação.
  const nomeSubmenu = /^(Servidor|Colaborador)\b/;
  const servidor = itemCadastro.getByRole('link', { name: nomeSubmenu }).first();
  const itemServidor = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: nomeSubmenu }) });
  const cargo = itemServidor.getByRole('link', { name: 'Cargo', exact: true });

  await expect(cadastro).toBeVisible({ timeout: 15000 });
  if (!await servidor.isVisible()) await cadastro.click();
  await expect(servidor).toBeVisible({ timeout: 15000 });
  if (!await cargo.isVisible()) await servidor.click();
  await expect(cargo).toBeVisible({ timeout: 15000 });
  await cargo.click();

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarCargo(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar Cargo/i });
  if (await formulario.isVisible()) {
    await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaCargo(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
  await getByRoleSge(conteudo, 'button', { name: /Salvar/i }).waitFor({ state: 'visible', timeout: 15000 });
}

export async function voltarParaConsultaCargo(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(getByRoleSge(conteudo, 'heading', { name: TITULO_CONSULTA_CARGO }))
    .toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

export async function pesquisarCargo(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaCargo(page);
  const conteudo = main(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');
  const botaoPesquisar = conteudo.locator('#searchForm button[type="submit"]:visible');

  await expect(pesquisa).toBeVisible();
  await pesquisa.fill(termo);
  await expect(botaoPesquisar).toBeVisible();

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR') === '/cargo/indexgrid';
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Cargos retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
}

export function linhaCargo(page: Page, descricao: string): Locator {
  const conteudo = main(page);
  return conteudo.getByText(descricao, { exact: true }).locator('xpath=ancestor::tr[1]');
}
