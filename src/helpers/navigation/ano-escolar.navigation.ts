import { expect, type Locator, type Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Ano Escolar e Unidades Curriculares/i;
const TITULO_ADICIONAR = /Adicionar Ano Escolar/i;
const TITULO_EDITAR = /Editar Ano Escolar/i;

function main(page: Page): Locator {
  return page.locator('#main');
}

function botaoAdicionar(page: Page): Locator {
  return page.locator('button[title="Adicionar"]:visible');
}

export async function aguardarCarregamentoAnoEscolar(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Abre a consulta pelo caminho visível Cadastro > Ensino > Ano Escolar. */
export async function navegarParaConsultaAnoEscolar(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = conteudo.getByRole('heading', { name: TITULO_CONSULTA, includeHidden: true });
  const busca = conteudo.locator('#searchTerm:visible');
  const tabela = conteudo.locator('table:visible');

  await aguardarCarregamentoAnoEscolar(page);
  if (await titulo.isVisible().catch(() => false)) {
    await busca.waitFor({ state: 'visible', timeout: 20000 });
    await tabela.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const formulario = conteudo.getByRole('heading', { name: /^(Adicionar|Editar) Ano Escolar$/i, includeHidden: true });
  if (await formulario.isVisible().catch(() => false)) {
    const voltar = conteudo.getByRole('button', { name: /^\s*Voltar\s*$/ });
    await voltar.waitFor({ state: 'visible', timeout: 10000 });
    await voltar.click();
    await titulo.waitFor({ state: 'visible', timeout: 20000 });
    await busca.waitFor({ state: 'visible', timeout: 20000 });
    await tabela.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const cadastro = nav.locator('a:visible').filter({ hasText: /^\s*Cadastro(?:\s|$)/ }).first();
  const itemCadastro = cadastro.locator('xpath=ancestor::li[1]');
  const ensino = itemCadastro.locator('a:visible').filter({ hasText: /^\s*Ensino(?:\s|$)/ }).first();
  const itemEnsino = ensino.locator('xpath=ancestor::li[1]');
  const destino = itemEnsino.locator('a:visible').filter({ hasText: /^\s*Ano Escolar\s*$/ });

  if (!await destino.isVisible().catch(() => false)) {
    await cadastro.waitFor({ state: 'visible', timeout: 15000 });
    if (!await ensino.isVisible().catch(() => false)) await cadastro.click();
    await ensino.waitFor({ state: 'visible', timeout: 15000 });
    if (!await destino.isVisible().catch(() => false)) await ensino.click();
  }

  await destino.waitFor({ state: 'visible', timeout: 15000 });
  await destino.click();
  await titulo.waitFor({ state: 'visible', timeout: 30000 });
  await aguardarCarregamentoAnoEscolar(page);
  await busca.waitFor({ state: 'visible', timeout: 20000 });
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
  await botaoAdicionar(page).waitFor({ state: 'visible', timeout: 15000 });
}

/** Abre o formulário ao escolher Ano Escolar no menu visível Adicionar. */
export async function navegarParaAdicionarAnoEscolar(page: Page): Promise<void> {
  await navegarParaConsultaAnoEscolar(page);
  await botaoAdicionar(page).click();
  const opcao = botaoAdicionar(page).locator('xpath=..')
    .locator('ul.dropdown-menu:visible a:visible')
    .filter({ hasText: /^\s*Ano Escolar\s*$/ });
  await opcao.waitFor({ state: 'visible', timeout: 10000 });
  await opcao.click();
  await main(page).getByRole('heading', { name: TITULO_ADICIONAR, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 20000 });
  await main(page).locator('#Nome').waitFor({ state: 'visible', timeout: 15000 });
}

export function linhaAnoEscolar(page: Page, nome: string): Locator {
  const escapado = nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return main(page).locator('table:visible tbody tr:visible').filter({
    has: page.locator('td:visible').filter({ hasText: new RegExp(`^\\s*${escapado}\\s*$`, 'i') }),
  });
}

export async function pesquisarAnoEscolar(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaAnoEscolar(page);
  const busca = main(page).locator('#searchTerm:visible');
  const pesquisar = main(page).locator('#btnSubmitSearch:visible');
  await busca.fill(termo);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase().replace(/\/$/, '') === '/serie/indexgrid'
        && url.searchParams.get('searchTerm') === termo
        && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    pesquisar.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A pesquisa de Ano Escolar retornou HTTP ${resposta.status()}.`);

  await aguardarCarregamentoAnoEscolar(page);
  const processamento = main(page).locator('.dataTables_processing');
  if (await processamento.isVisible().catch(() => false)) {
    await processamento.waitFor({ state: 'hidden', timeout: 15000 });
  }
  await main(page).locator('table:visible').waitFor({ state: 'visible', timeout: 15000 });
}

export async function indiceColunaAnoEscolar(page: Page): Promise<number> {
  const cabecalhos = main(page).locator('table:visible thead th:visible');
  for (let indice = 0; indice < await cabecalhos.count(); indice++) {
    const texto = (await cabecalhos.nth(indice).innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim()
      .toLocaleLowerCase('pt-BR');
    if (texto === 'ano escolar') return indice;
  }
  throw new Error('Não foi possível identificar a coluna "Ano Escolar" na consulta.');
}

export async function marcadorGradeAnoEscolar(page: Page): Promise<string> {
  const info = main(page).locator('.dataTables_info:visible').first();
  const primeiraLinha = main(page).locator('table:visible tbody tr:visible').first();
  const [textoInfo, textoLinha] = await Promise.all([
    info.innerText().catch(() => ''),
    primeiraLinha.innerText().catch(() => ''),
  ]);
  return `${textoInfo.trim()}|${textoLinha.trim()}`;
}

export async function aguardarAtualizacaoGradeAnoEscolar(page: Page, marcadorAnterior: string): Promise<void> {
  await expect.poll(() => marcadorGradeAnoEscolar(page), {
    timeout: 15000,
    message: 'A grade de Ano Escolar não refletiu a paginação solicitada.',
  }).not.toBe(marcadorAnterior);
}
