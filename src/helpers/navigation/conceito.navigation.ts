import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const ROTA_CONCEITO = '/conceito';

function main(page: Page): Locator {
  return page.locator('#main');
}

export async function aguardarCarregamentoConceito(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Navega usando apenas os menus visíveis Cadastro > Ensino > Conceito. */
export async function navegarParaConsultaConceito(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = conteudo.getByRole('heading', { name: /Consulta de Conceitos/i, includeHidden: true });
  const tabela = conteudo.locator('table');
  const busca = conteudo.locator('#searchTerm');
  await aguardarCarregamentoConceito(page);

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
  const destino = itemEnsino.getByRole('link', { name: 'Conceito', exact: true });

  if (!await destino.isVisible().catch(() => false)) {
    await cadastro.waitFor({ state: 'visible', timeout: 15000 });
    if (!await ensino.isVisible().catch(() => false)) await cadastro.click();
    await ensino.waitFor({ state: 'visible', timeout: 15000 });
    if (!await destino.isVisible().catch(() => false)) await ensino.click();
  }

  await destino.waitFor({ state: 'visible', timeout: 15000 });
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA_CONCEITO && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A consulta de Conceitos retornou HTTP ${resposta.status()}.`);

  await expect(titulo).toBeVisible({ timeout: 30000 });
  await aguardarCarregamentoConceito(page);
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
  await busca.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarConceito(page: Page): Promise<void> {
  await navegarParaConsultaConceito(page);
  const adicionar = getByRoleSge(main(page), 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await main(page).getByRole('heading', { name: /Adicionar Conceito/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 15000 });
  await main(page).locator('#Sigla').waitFor({ state: 'visible', timeout: 15000 });
  await main(page).locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
}

export function linhaConceito(page: Page, descricao: string): Locator {
  return main(page).locator('table tbody tr:visible').filter({
    has: page.getByRole('cell', { name: descricao, exact: true, includeHidden: true }),
  });
}

/** Pesquisa na grade visível e aguarda a resposta AJAX iniciada pelo botão Buscar. */
export async function pesquisarConceito(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaConceito(page);
  const busca = main(page).locator('#searchTerm');
  await busca.fill(termo);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase().replace(/\/$/, '') === `${ROTA_CONCEITO}/indexgrid`
        && response.request().method() === 'POST'
        && new URLSearchParams(response.request().postData() || '').get('searchTerm') === termo;
    }, { timeout: 20000 }),
    main(page).getByRole('button', { name: '', exact: true, includeHidden: true }).click(),
  ]);
  if (!resposta.ok()) throw new Error(`A pesquisa de Conceitos retornou HTTP ${resposta.status()}.`);
  await aguardarCarregamentoConceito(page);
  await main(page).locator('table').waitFor({ state: 'visible', timeout: 15000 });
}
