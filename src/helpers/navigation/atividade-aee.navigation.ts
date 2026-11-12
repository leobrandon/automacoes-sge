import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const CONSULTA_AEE = /Atividades de AEE/i;
const ROTA_AEE = '/atividadedeaee';

function main(page: Page): Locator {
  return page.locator('#main');
}

export async function aguardarCarregamentoAtividadeAee(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Navega pelos menus visíveis Cadastro > Ensino > Atividades de AEE. */
export async function navegarParaConsultaAtividadeAee(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = getByRoleSge(conteudo, 'heading', { name: CONSULTA_AEE });
  const tituloRenderizado = conteudo.locator('h4').filter({ hasText: CONSULTA_AEE });
  const tabela = conteudo.locator('table');
  const busca = conteudo.locator('#searchTerm');

  await aguardarCarregamentoAtividadeAee(page);
  if (await titulo.isVisible().catch(() => false)) {
    await tabela.waitFor({ state: 'visible', timeout: 20000 });
    await busca.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav');
  const cadastro = nav.getByRole('link', { name: /Cadastro/ }).first();
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemCadastro = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /Cadastro/ }) });
  const ensino = itemCadastro.getByRole('link', { name: /^Ensino(?:\s|$)/ }).first();
  const itemEnsino = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /^Ensino(?:\s|$)/ }) });
  const destino = itemEnsino.getByRole('link', { name: /^Atividades de AEE$/i, exact: true });

  if (!await destino.isVisible().catch(() => false)) {
    if (!await ensino.isVisible().catch(() => false)) {
      await cadastro.waitFor({ state: 'visible', timeout: 15000 });
      await cadastro.click();
    }
    await ensino.waitFor({ state: 'visible', timeout: 15000 });
    if (!await destino.isVisible().catch(() => false)) await ensino.click();
  }

  await destino.waitFor({ state: 'visible', timeout: 15000 });
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA_AEE && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A consulta de Atividades de AEE retornou HTTP ${resposta.status()}.`);

  await tituloRenderizado.waitFor({ state: 'visible', timeout: 30000 });
  await aguardarCarregamentoAtividadeAee(page);
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
  await busca.waitFor({ state: 'visible', timeout: 20000 });
  await getByRoleSge(conteudo, 'button', { name: '', exact: true })
    .waitFor({ state: 'visible', timeout: 15000 });
}

export async function navegarParaAdicionarAtividadeAee(page: Page): Promise<void> {
  await navegarParaConsultaAtividadeAee(page);
  await getByRoleSge(main(page), 'button', { name: '', exact: true }).click();
  await getByRoleSge(main(page), 'heading', { name: /Adicionar atividade/i })
    .waitFor({ state: 'visible', timeout: 15000 });
  await main(page).locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
}

export function linhaAtividadeAee(page: Page, descricao: string): Locator {
  return main(page).locator('table tbody tr:visible').filter({
    hasText: descricao,
  });
}

export async function pesquisarAtividadeAee(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaAtividadeAee(page);
  const busca = main(page).locator('#searchTerm');
  const botaoPesquisar = main(page).locator('#btnSubmitSearch');
  await busca.fill(termo);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase().replace(/\/$/, '') === `${ROTA_AEE}/indexgrid`
        && url.searchParams.get('searchTerm') === termo
        && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A pesquisa de Atividades de AEE retornou HTTP ${resposta.status()}.`);

  await aguardarCarregamentoAtividadeAee(page);
  await main(page).locator('table').waitFor({ state: 'visible', timeout: 15000 });
}

export async function confirmarAvisoAee(page: Page, nomeBotao: 'Sim' | 'Ok'): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: nomeBotao, exact: true }) });
  await dialog.waitFor({ state: 'visible', timeout: 15000 });
  await dialog.getByRole('button', { name: nomeBotao, exact: true }).click();
  if (nomeBotao === 'Ok') await dialog.waitFor({ state: 'hidden', timeout: 15000 });
}

export async function confirmarExclusaoAee(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: /Deseja realmente excluir essa Atividade de AEE\?/i });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await dialog.getByRole('button', { name: 'Sim', exact: true }).click();
  const sucesso = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Ok', exact: true }) });
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });
}
