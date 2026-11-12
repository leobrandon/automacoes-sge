import { expect, type Locator, type Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Componentes/i;
const CAMINHO_MENU = 'Componentes';

function main(page: Page): Locator {
  return page.locator('#main');
}

export async function marcadorGradeComponentes(page: Page): Promise<string> {
  const info = main(page).locator('.dataTables_info:visible').first();
  const primeiraLinha = main(page).locator('table:visible tbody tr:visible').first();
  const [textoInfo, textoLinha] = await Promise.all([
    info.innerText().catch(() => ''),
    primeiraLinha.innerText().catch(() => ''),
  ]);
  return `${textoInfo.trim()}|${textoLinha.trim()}`;
}

export async function aguardarAtualizacaoGradeComponentes(page: Page, marcadorAnterior: string): Promise<void> {
  await expect.poll(() => marcadorGradeComponentes(page), {
    timeout: 15000,
    message: 'A grade de Componentes não refletiu a pesquisa ou paginação solicitada.',
  }).not.toBe(marcadorAnterior);
}

function botaoAdicionar(page: Page): Locator {
  return main(page).locator('button:visible').filter({ hasText: /^\s*Adicionar\s*$/ });
}

export async function aguardarCarregamentoComponentes(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Abre a consulta pelo menu visível Cadastro > Ensino > Componentes. */
export async function navegarParaConsultaComponentes(page: Page): Promise<void> {
  const conteudo = main(page);
  const tituloRenderizado = conteudo.locator('h4:visible').filter({ hasText: TITULO_CONSULTA });
  const busca = conteudo.locator('#searchTerm:visible');
  const tabela = conteudo.locator('table:visible');

  await aguardarCarregamentoComponentes(page);
  if (await tituloRenderizado.isVisible().catch(() => false)) {
    await busca.waitFor({ state: 'visible', timeout: 20000 });
    await tabela.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const cadastro = nav.locator('a:visible').filter({ hasText: /Cadastro/ }).first();
  const itemCadastro = cadastro.locator('xpath=ancestor::li[1]');
  const ensino = itemCadastro.locator('a:visible').filter({ hasText: /Ensino(?:\s|$)/ }).first();
  const itemEnsino = ensino.locator('xpath=ancestor::li[1]');
  const destino = itemEnsino.locator('a:visible').filter({ hasText: new RegExp(CAMINHO_MENU) });

  if (!await destino.isVisible().catch(() => false)) {
    if (!await ensino.isVisible().catch(() => false)) {
      await cadastro.waitFor({ state: 'visible', timeout: 15000 });
      await cadastro.click();
    }
    await ensino.waitFor({ state: 'visible', timeout: 15000 });
    if (!await destino.isVisible().catch(() => false)) await ensino.click();
  }

  await destino.waitFor({ state: 'visible', timeout: 15000 });
  await destino.click();
  await tituloRenderizado.waitFor({ state: 'visible', timeout: 30000 });
  await aguardarCarregamentoComponentes(page);
  await tituloRenderizado.waitFor({ state: 'visible', timeout: 20000 });
  await busca.waitFor({ state: 'visible', timeout: 20000 });
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
  await botaoAdicionar(page).waitFor({ state: 'visible', timeout: 15000 });
}

export async function navegarParaAdicionarComponente(page: Page): Promise<void> {
  await navegarParaConsultaComponentes(page);
  await botaoAdicionar(page).click();
  await main(page).getByRole('heading', { name: /Adicionar Componente/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 15000 });
  await main(page).locator('#form_disciplina #Nome').waitFor({ state: 'visible', timeout: 15000 });
}

export async function navegarParaEditarComponente(page: Page): Promise<void> {
  await main(page).getByRole('heading', { name: /Editar Componente/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 15000 });
  await main(page).locator('#form_disciplina #Nome').waitFor({ state: 'visible', timeout: 15000 });
}

export function linhaComponente(page: Page, nome: string): Locator {
  const escapado = nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return main(page).locator('table:visible tbody tr:visible').filter({
    has: page.locator('td:visible').filter({ hasText: new RegExp(`^\\s*${escapado}\\s*$`, 'i') }),
  });
}

export async function indiceColunaNomeComponente(page: Page): Promise<number> {
  const cabecalhos = main(page).locator('table:visible thead th');
  for (let indice = 0; indice < await cabecalhos.count(); indice++) {
    const texto = (await cabecalhos.nth(indice).innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase('pt-BR');
    if (texto === 'nome') return indice;
  }
  throw new Error('Não foi possível identificar a coluna "Nome" na consulta de Componentes.');
}

export async function pesquisarComponente(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaComponentes(page);
  const busca = main(page).locator('#searchTerm:visible');
  const botaoPesquisar = main(page).locator('#searchForm:visible button[type="submit"]');
  await busca.fill(termo);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase().replace(/\/$/, '') === '/disciplina/indexgrid'
        && url.searchParams.get('searchTerm') === termo
        && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);

  if (!resposta.ok()) throw new Error(`A pesquisa de Componentes retornou HTTP ${resposta.status()}.`);
  await aguardarCarregamentoComponentes(page);
  const processamento = main(page).locator('.dataTables_processing');
  if (await processamento.isVisible().catch(() => false)) {
    await processamento.waitFor({ state: 'hidden', timeout: 15000 });
  }
  await main(page).locator('table:visible').waitFor({ state: 'visible', timeout: 15000 });
}
