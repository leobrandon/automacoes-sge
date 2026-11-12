import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Tipo de Ocorrência Escolar/i;
const TITULO_EDICAO = /Editar Tipo de Ocorrência Escolar/i;

function main(page: Page): Locator {
  return page.locator('#main');
}

export async function aguardarCarregamentoTipoOcorrenciaEscolar(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Navega por Cadastro > Tipo de Ocorrência Escolar usando os menus visíveis. */
export async function navegarParaConsultaTipoOcorrenciaEscolar(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = getByRoleSge(conteudo, 'heading', { name: TITULO_CONSULTA });
  const tabela = conteudo.locator('table:visible');
  const busca = conteudo.locator('#searchTerm:visible');
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });

  await aguardarCarregamentoTipoOcorrenciaEscolar(page);
  if (await titulo.isVisible()) {
    await expect(tabela).toBeVisible({ timeout: 20000 });
    await expect(busca).toBeVisible({ timeout: 20000 });
    await expect(adicionar).toBeVisible({ timeout: 20000 });
    return;
  }

  const formulario = getByRoleSge(conteudo, 'heading', {
    name: /(Adicionar|Editar) Tipo de Ocorrência Escolar/i,
  });
  if (await formulario.isVisible()) {
    const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
    await expect(voltar).toBeVisible({ timeout: 15000 });
    await voltar.click();
    await expect(titulo).toBeVisible({ timeout: 20000 });
    await aguardarCarregamentoTipoOcorrenciaEscolar(page);
    await expect(tabela).toBeVisible({ timeout: 20000 });
    await expect(busca).toBeVisible({ timeout: 20000 });
    await expect(adicionar).toBeVisible({ timeout: 20000 });
    return;
  }

  const menu = page.locator('#menu-gestao:visible');
  const cadastro = menu.locator('a:visible').filter({ hasText: /^\s*Cadastro(?:\s|$)/ });
  const destino = menu.locator('a').filter({ hasText: /^\s*Tipo de Ocorrência Escolar\s*$/ });
  if (!await destino.isVisible()) await cadastro.click();
  await expect(destino).toBeVisible({ timeout: 15000 });
  await destino.click();

  await expect(titulo).toBeVisible({ timeout: 30000 });
  await aguardarCarregamentoTipoOcorrenciaEscolar(page);
  await expect(tabela).toBeVisible({ timeout: 20000 });
  await expect(busca).toBeVisible({ timeout: 20000 });
  await expect(adicionar).toBeVisible({ timeout: 20000 });
}

export async function pesquisarTipoOcorrenciaEscolar(page: Page, descricao: string): Promise<void> {
  await navegarParaConsultaTipoOcorrenciaEscolar(page);
  const conteudo = main(page);
  const busca = conteudo.locator('#searchTerm:visible');
  const pesquisar = conteudo.locator('#btnSubmitSearch:visible');

  await expect(busca).toBeVisible();
  await busca.fill(descricao);
  await expect(pesquisar).toBeVisible();
  const respostaPromessa = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname.toLowerCase() === '/tipoocorrenciaescolar/indexgrid'
      && response.request().method() === 'GET'
      && url.searchParams.get('searchTerm') === descricao;
  });
  await pesquisar.click();
  const resposta = await respostaPromessa;
  if (!resposta.ok()) throw new Error(`A busca de Tipo de Ocorrência Escolar retornou HTTP ${resposta.status()}.`);
  await resposta.finished();
  await aguardarCarregamentoTipoOcorrenciaEscolar(page);
  await expect(conteudo.locator('table:visible')).toBeVisible({ timeout: 15000 });
}

export function linhaTipoOcorrenciaEscolar(page: Page, descricao: string): Locator {
  const conteudo = main(page);
  const linhas = conteudo.locator('table:visible tbody tr:visible');
  return linhas.filter({ has: getByRoleSge(page, 'cell', { name: descricao, exact: true }) });
}

export async function abrirEdicaoTipoOcorrenciaEscolar(page: Page, descricao: string): Promise<void> {
  const linha = linhaTipoOcorrenciaEscolar(page, descricao);
  await expect(linha.getByText(descricao, { exact: true })).toBeVisible({ timeout: 15000 });
  const quantidade = await linha.count();
  if (quantidade !== 1) {
    throw new Error(`A descrição exata "${descricao}" retornou ${quantidade} linhas; nenhuma foi aberta.`);
  }

  const celulaDescricao = linha.getByText(descricao, { exact: true });
  await expect(celulaDescricao).toBeVisible();
  await celulaDescricao.click();

  await expect(getByRoleSge(main(page), 'heading', { name: TITULO_EDICAO }))
    .toBeVisible({ timeout: 20000 });
  await aguardarCarregamentoTipoOcorrenciaEscolar(page);
  await expect(main(page).locator('#Descricao')).toHaveValue(descricao);
}
