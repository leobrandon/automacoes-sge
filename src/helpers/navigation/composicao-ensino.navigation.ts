import type { Locator, Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Composição de Ensino/i;
const CAMINHO_MENU = /composição\s+de\s+ensino/i;

function main(page: Page): Locator {
  return page.locator('#main');
}

function botaoAdicionar(page: Page): Locator {
  return main(page).getByRole('button', { name: /Adicionar/i, includeHidden: true });
}

export async function aguardarCarregamentoComposicaoEnsino(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Abre a consulta exclusivamente pelos menus visíveis Cadastro > Ensino. */
export async function navegarParaConsultaComposicaoEnsino(page: Page): Promise<void> {
  const conteudo = main(page);
  // O SGE mantém aria-hidden em #main após o SweetAlert; o conteúdo segue visível.
  const titulo = conteudo.getByRole('heading', { name: TITULO_CONSULTA, includeHidden: true });
  const tituloRenderizado = conteudo.locator('h4').filter({ hasText: TITULO_CONSULTA });
  const busca = conteudo.locator('#searchTerm');
  const tabela = conteudo.locator('table');

  await aguardarCarregamentoComposicaoEnsino(page);
  if (await titulo.isVisible().catch(() => false)) {
    await busca.waitFor({ state: 'visible', timeout: 15000 });
    await tabela.waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  const nav = page.locator('nav');
  const cadastro = nav.getByRole('link', { name: /Cadastro/ }).first();
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemCadastro = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /Cadastro/ }) });
  const ensino = itemCadastro.getByRole('link', { name: /^Ensino(?:\s|$)/ }).first();
  const itemEnsino = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /^Ensino(?:\s|$)/ }) });
  const destino = itemEnsino.getByRole('link', { name: CAMINHO_MENU, exact: true });

  if (!await destino.isVisible().catch(() => false)) {
    if (!await ensino.isVisible().catch(() => false)) {
      await cadastro.waitFor({ state: 'visible', timeout: 15000 });
      await cadastro.click();
    }
    await ensino.waitFor({ state: 'visible', timeout: 15000 });
    if (!await destino.isVisible().catch(() => false)) {
      await ensino.click();
    }
  }

  await destino.waitFor({ state: 'visible', timeout: 15000 });
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === '/composicaoensino' && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Composição de Ensino retornou HTTP ${resposta.status()}.`);
  }

  // A tela chega via AJAX. O SGE pode ativar o SweetAlert depois da resposta,
  // deixando #main com aria-hidden=true enquanto o carregamento termina.
  await tituloRenderizado.waitFor({ state: 'visible', timeout: 30000 });
  await aguardarCarregamentoComposicaoEnsino(page);
  await titulo.waitFor({ state: 'visible', timeout: 20000 });
  await busca.waitFor({ state: 'visible', timeout: 20000 });
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
  await botaoAdicionar(page).waitFor({ state: 'visible', timeout: 15000 });
}

export async function navegarParaAdicionarComposicaoEnsino(page: Page): Promise<void> {
  await navegarParaConsultaComposicaoEnsino(page);
  await botaoAdicionar(page).click();
  await main(page).getByRole('heading', { name: /Adicionar Composição de Ensino/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 15000 });
  await main(page).locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
}

export function linhaComposicaoEnsino(page: Page, descricao: string): Locator {
  const escapada = descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return main(page).locator('table tbody tr').filter({
    has: page.locator('td').filter({ hasText: new RegExp(`^\\s*${escapada}\\s*$`, 'i') }).first(),
  });
}

export async function pesquisarComposicaoEnsino(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaComposicaoEnsino(page);
  const busca = main(page).locator('#searchTerm');
  const botaoPesquisar = main(page).locator('#searchForm button[type="submit"]');

  await busca.fill(termo);
  const gradeAnterior = await main(page).locator('table').elementHandle();
  try {
    const [resposta] = await Promise.all([
      page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname.toLowerCase().replace(/\/$/, '') === '/composicaoensino/indexgrid'
          && url.searchParams.get('searchTerm') === termo
          && response.request().method() === 'GET';
      }, { timeout: 15000 }),
      botaoPesquisar.click(),
    ]);
    if (!resposta.ok()) {
      throw new Error(`A pesquisa de Composição de Ensino retornou HTTP ${resposta.status()}.`);
    }
    if (gradeAnterior) {
      await page.waitForFunction(elemento => !elemento.isConnected, gradeAnterior, { timeout: 15000 });
    }
  } finally {
    await gradeAnterior?.dispose();
  }
  await aguardarCarregamentoComposicaoEnsino(page);
  const processamento = main(page).locator('.dataTables_processing');
  if (await processamento.isVisible().catch(() => false)) {
    await processamento.waitFor({ state: 'hidden', timeout: 15000 });
  }
  await main(page).locator('table').waitFor({ state: 'visible', timeout: 15000 });
}
