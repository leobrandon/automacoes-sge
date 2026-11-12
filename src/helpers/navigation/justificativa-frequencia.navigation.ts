import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const CONSULTA = /Consulta de Justificativas de Frequência/i;
const ROTA_JUSTIFICATIVA = '/justificativafrequencia';

function main(page: Page): Locator {
  return page.locator('#main');
}

export async function aguardarCarregamentoJustificativaFrequencia(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Navega até Cadastro > Ensino > Justificativa de Frequência pelos menus visíveis. */
export async function navegarParaConsultaJustificativaFrequencia(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = getByRoleSge(conteudo, 'heading', { name: CONSULTA });
  const tabela = conteudo.locator('table:visible');
  const busca = conteudo.locator('#searchTerm:visible');
  await aguardarCarregamentoJustificativaFrequencia(page);

  if (await titulo.isVisible().catch(() => false)) {
    await tabela.waitFor({ state: 'visible', timeout: 20000 });
    await busca.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const cadastro = nav.getByRole('link', { name: /Cadastro/ }).first();
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemCadastro = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /Cadastro/ }) });
  const ensino = itemCadastro.getByRole('link', { name: /^Ensino(?:\s|$)/ }).first();
  const itemEnsino = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /^Ensino(?:\s|$)/ }) });
  const destino = itemEnsino.getByRole('link', { name: 'Justificativa de Frequência', exact: true });

  await expect(cadastro).toBeVisible({ timeout: 15000 });
  if (!await ensino.isVisible().catch(() => false)) await cadastro.click();
  await expect(ensino).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible().catch(() => false)) await ensino.click();
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLocaleLowerCase('pt-BR').replace(/\/$/, '');
      return caminho === ROTA_JUSTIFICATIVA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Justificativas de Frequência retornou HTTP ${resposta.status()}.`);
  }

  await expect(titulo).toBeVisible({ timeout: 30000 });
  await aguardarCarregamentoJustificativaFrequencia(page);
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
  await busca.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarJustificativaFrequencia(page: Page): Promise<void> {
  await navegarParaConsultaJustificativaFrequencia(page);
  const adicionar = getByRoleSge(main(page), 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await main(page).locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
  await main(page).locator('#btn-salvar').waitFor({ state: 'visible', timeout: 15000 });
}

export async function pesquisarJustificativaFrequencia(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaJustificativaFrequencia(page);
  const busca = main(page).locator('#searchTerm:visible');
  await busca.fill(termo);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR').replace(/\/$/, '') === `${ROTA_JUSTIFICATIVA}/indexgrid`
        && response.request().method() === 'GET'
        && url.searchParams.get('searchTerm') === termo;
    }, { timeout: 20000 }),
    main(page).locator('#btn-search:visible').click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A pesquisa de Justificativas de Frequência retornou HTTP ${resposta.status()}.`);
  }
  await aguardarCarregamentoJustificativaFrequencia(page);
  await main(page).locator('table:visible').waitFor({ state: 'visible', timeout: 15000 });
}

export function linhaJustificativaFrequencia(page: Page, descricao: string): Locator {
  const textoExato = descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return main(page).locator('table:visible tbody tr:visible td:first-child')
    .filter({ hasText: new RegExp(`^\\s*${textoExato}\\s*$`) })
    .locator('xpath=..');
}
