import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildMotivoMovimentacao,
  type BuildMotivoMovimentacaoOptions,
} from '../../factories/motivo-movimentacao.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const ROTA = '/motivodemovimentacao';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaMotivoMovimentacao(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: /Consulta de Motivos de Movimentação/ });
}

/** Navega pelo menu visível Cadastro > Motivos de Movimentação. */
export async function navegarParaConsultaMotivoMovimentacao(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaMotivoMovimentacao(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  // O nome acessível de Cadastro inclui ícones; a expressão evita confundir com "Cadastros Básicos".
  const cadastro = nav.getByRole('link', { name: /Cadastro\s/ });
  const destino = nav.getByRole('link', { name: 'Motivos de Movimentação', exact: true });

  if (!await destino.isVisible()) {
    await expect(cadastro).toBeVisible({ timeout: 15000 });
    await cadastro.click();
  }
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Motivos de Movimentação retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

/** Pesquisa por trecho da descrição (a grade não filtra situação por padrão). */
export async function pesquisarMotivoMovimentacao(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaMotivoMovimentacao(page);
  const conteudo = main(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');
  const botaoPesquisar = conteudo.locator('#searchForm button[type="submit"]:visible');

  await expect(pesquisa).toBeVisible();
  await pesquisa.fill(termo);
  await expect(botaoPesquisar).toBeVisible();

  // A grade é substituída por inteiro após a resposta; marca a atual para só aceitar a nova tabela.
  await conteudo.locator('#grid table').evaluateAll((tabelas) => {
    tabelas.forEach((tabela) => tabela.setAttribute('data-grade-anterior', 'true'));
  });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase() === `${ROTA}/indexgrid` && response.request().method() === 'POST';
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A pesquisa de Motivos de Movimentação retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Linha da grade cuja descrição é exatamente `descricao` (a pesquisa é por trecho). */
export function linhaMotivoMovimentacao(page: Page, descricao: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByText(descricao, { exact: true }) });
}

export async function navegarParaAdicionarMotivoMovimentacao(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar Motivo de Movimentação/ });
  if (await formulario.isVisible()) {
    await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaMotivoMovimentacao(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
  await getByRoleSge(conteudo, 'button', { name: /Salvar/ }).waitFor({ state: 'visible', timeout: 15000 });
}

/** Abre a edição clicando na descrição da linha (a grade não tem botões de ação). */
export async function abrirEdicaoMotivoMovimentacao(page: Page, descricao: string): Promise<void> {
  const conteudo = main(page);
  const linha = linhaMotivoMovimentacao(page, descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByText(descricao, { exact: true }).click();

  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar Motivo de Movimentação/ }))
    .toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#Descricao')).toHaveValue(descricao, { timeout: 15000 });
}

export async function voltarParaConsultaMotivoMovimentacao(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/ });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(tituloConsultaMotivoMovimentacao(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

/**
 * Menor sequência >= `inicio` cuja descrição ainda não existe na consulta. O SGE recusa
 * descrição repetida; nada é excluído aqui.
 */
export async function proximaSequenciaLivreMotivoMovimentacao(
  page: Page,
  options: BuildMotivoMovimentacaoOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { descricao } = buildMotivoMovimentacao(options, sequencia);
    await pesquisarMotivoMovimentacao(page, descricao);
    if (await linhaMotivoMovimentacao(page, descricao).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos registros QAAUTO de Motivos de Movimentação.',
  );
}

export async function confirmarExclusaoMotivoMovimentacao(page: Page): Promise<void> {
  await expect(page.getByText('Tem certeza que deseja excluir?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
}
