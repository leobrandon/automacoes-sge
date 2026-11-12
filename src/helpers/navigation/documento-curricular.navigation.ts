import { expect, type Locator, type Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

const CONSULTA = /Consulta de Documento Curricular/i;
const TITULO_EDITAR = /Editar Documento Curricular/i;

function main(page: Page): Locator { return page.locator('#main'); }

export async function aguardarCarregamentoDocumentoCurricular(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

export async function navegarParaConsultaDocumentoCurricular(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = conteudo.getByRole('heading', { name: CONSULTA, includeHidden: true });
  await aguardarCarregamentoDocumentoCurricular(page);
  if (!await titulo.isVisible().catch(() => false)) {
    console.log('[Documento Curricular] Navegando pela interface: Cadastro > Ensino > Documento Curricular.');
    const nav = page.locator('nav:visible').first();
    const cadastro = nav.locator('a:visible').filter({ hasText: /^\s*Cadastro(?:\s|$)/ }).first();
    const cadastroLi = cadastro.locator('..');
    const ensino = cadastroLi.locator('a:visible').filter({ hasText: /^\s*Ensino(?:\s|$)/ }).first();
    const ensinoLi = ensino.locator('..');
    const destino = ensinoLi.locator('a:visible').filter({ hasText: /^\s*Documento Curricular\s*$/ }).first();
    if (!await ensino.isVisible().catch(() => false)) await cadastro.click();
    if (!await destino.isVisible().catch(() => false)) await ensino.click();
    await destino.waitFor({ state: 'visible', timeout: 15000 });
    await destino.click();
    await titulo.waitFor({ state: 'visible', timeout: 30000 });
    await aguardarCarregamentoDocumentoCurricular(page);
    console.log('[Documento Curricular] Consulta de Documento Curricular aberta.');
  }
  await conteudo.locator('#searchTerm:visible').waitFor({ state: 'visible', timeout: 20000 });
  await conteudo.locator('table:visible').waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarDocumentoCurricular(page: Page): Promise<void> {
  console.log('[Documento Curricular] Abrindo formulário de inclusão.');
  await navegarParaConsultaDocumentoCurricular(page);
  const adicionar = main(page).getByTitle(/Adicionar Documento Curricular/i);
  await adicionar.waitFor({ state: 'visible', timeout: 15000 });
  await adicionar.click();
  await main(page).getByRole('heading', { name: /Adicionar Documento Curricular/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 20000 });
  await main(page).locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
  console.log('[Documento Curricular] Formulário de inclusão pronto.');
}

export function linhaDocumentoCurricular(page: Page, descricao: string): Locator {
  const escapada = descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page.locator('#main table tbody tr').filter({
    hasText: new RegExp(`^\\s*${escapada}(?:\\s|$)`, 'i'),
  });
}

export async function pesquisarDocumentoCurricular(page: Page, termo: string): Promise<void> {
  console.log(`[Documento Curricular] Pesquisando na grade: "${termo}".`);
  await navegarParaConsultaDocumentoCurricular(page);
  const busca = main(page).locator('#searchTerm:visible');
  const gradeAntes = await main(page).locator('table:visible').elementHandle();
  await busca.fill(termo);
  const [resposta] = await Promise.all([
    page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase().includes('/documentocurricular/indexgrid')
        && url.searchParams.get('searchTerm') === termo
        && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    main(page).locator('#searchForm button[type="submit"]:visible').click(),
  ]);
  if (!resposta.ok()) throw new Error(`A pesquisa de Documento Curricular retornou HTTP ${resposta.status()}.`);
  console.log(`[Documento Curricular] Resposta da pesquisa: HTTP ${resposta.status()}.`);
  if (gradeAntes) {
    await page.waitForFunction(element => !element.isConnected, gradeAntes, { timeout: 15000 });
    await gradeAntes.dispose();
  }
  await aguardarCarregamentoDocumentoCurricular(page);
  await expect(main(page).locator('table:visible')).toBeVisible();
  console.log(`[Documento Curricular] Grade atualizada para a pesquisa "${termo}".`);
}

export async function abrirEdicaoDocumentoCurricular(page: Page, descricao: string): Promise<void> {
  console.log(`[Documento Curricular] Localizando a linha exata de "${descricao}" para abrir a edição.`);
  const linha = linhaDocumentoCurricular(page, descricao);
  await linha.waitFor({ state: 'visible', timeout: 15000 });
  if (await linha.count() !== 1) throw new Error(`Esperada uma linha para "${descricao}"; encontradas ${await linha.count()}.`);
  await linha.locator('td:visible').first().click();
  await main(page).getByRole('heading', { name: TITULO_EDITAR, includeHidden: true }).waitFor({ state: 'visible', timeout: 20000 });
  await expect(main(page).locator('#Descricao')).toHaveValue(descricao);
  console.log(`[Documento Curricular] Edição aberta para "${descricao}".`);
}
