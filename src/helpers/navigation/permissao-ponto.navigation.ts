import { expect, type Locator, type Page } from '@playwright/test';
import { buildPermissaoPonto, type BuildPermissaoPontoOptions } from '../../factories/permissao-ponto.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Permissões Para o Uso do Ponto/i;
const ROTA = '/permissoesusoponto';
const LIMITE_BUSCA_SEQUENCIA = 200;

/** Ids dos parâmetros (toggles) do modal. */
export type ParametroPermissaoPonto =
  | 'AcessoPreFolha'
  | 'InserirJustificativaPreFolha'
  | 'PermitirRegistroManual'
  | 'RegistrarPontoViaAplicativo'
  | 'PermitirRegistrarForaDoRaio'
  | 'Ativo';

function main(page: Page): Locator {
  return page.locator('#main');
}

export function modalPermissaoPonto(page: Page): Locator {
  return page.locator('#modalPermissao');
}

export function tituloConsultaPermissaoPonto(page: Page): Locator {
  return main(page).locator('h4').filter({ hasText: TITULO_CONSULTA });
}

/** Navega pelo menu visível Cadastro > Ponto > Permissões Para Uso do Ponto. */
export async function navegarParaConsultaPermissaoPonto(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaPermissaoPonto(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const cadastro = nav.getByRole('link', { name: /Cadastro/ }).first();
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemCadastro = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /Cadastro/ }) });
  const ponto = itemCadastro.getByRole('link', { name: /^Ponto\b/ }).first();
  const itemPonto = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /^Ponto\b/ }) });
  const destino = itemPonto.getByRole('link', { name: 'Permissões Para Uso do Ponto', exact: true });

  await expect(cadastro).toBeVisible({ timeout: 15000 });
  if (!await ponto.isVisible()) await cadastro.click();
  await expect(ponto).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible()) await ponto.click();
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Permissões Para Uso do Ponto retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

/** Abre o modal "Adicionar Permissões Para o Uso do Ponto" a partir da consulta. */
export async function abrirModalAdicionarPermissaoPonto(page: Page): Promise<void> {
  const modal = modalPermissaoPonto(page);
  if (await modal.isVisible()) return;

  await navegarParaConsultaPermissaoPonto(page);
  const adicionar = getByRoleSge(main(page), 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  // O modal reaproveitado pode manter aria-hidden; getByRoleSge inclui elementos "ocultos" para a árvore de acessibilidade.
  await expect(getByRoleSge(modal, 'heading', { name: /Adicionar Permissões/i })).toBeVisible({ timeout: 15000 });
  await expect(modal.locator('#Descricao')).toBeVisible();
  await expect(modal.locator('#btnSalvar')).toBeVisible();
}

export async function pesquisarPermissaoPonto(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaPermissaoPonto(page);
  const conteudo = main(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');
  const botaoPesquisar = conteudo.locator('#btnSubmitSearch');

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
      return url.pathname.toLowerCase() === `${ROTA}/indexgrid`;
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A pesquisa de Permissões Para Uso do Ponto retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Linha da grade cuja descrição é exatamente `descricao` (a pesquisa é por trecho). */
export function linhaPermissaoPonto(page: Page, descricao: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByText(descricao, { exact: true }) });
}

/** Abre o modal de edição clicando na descrição da linha (a grade não tem lixeira). */
export async function abrirEdicaoPermissaoPonto(page: Page, descricao: string): Promise<void> {
  const modal = modalPermissaoPonto(page);
  const linha = linhaPermissaoPonto(page, descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByText(descricao, { exact: true }).click();

  await expect(getByRoleSge(modal, 'heading', { name: /Editar Permissões/i })).toBeVisible({ timeout: 20000 });
  await expect(modal.locator('#Descricao')).toHaveValue(descricao, { timeout: 15000 });
}

/** Define um parâmetro do modal pelo toggle visível; confirma o estado depois do clique. */
export async function definirParametroPermissaoPonto(
  page: Page,
  parametro: ParametroPermissaoPonto,
  valor: boolean,
): Promise<void> {
  const modal = modalPermissaoPonto(page);
  const controle = modal.locator(`#${parametro}`);
  // Parâmetros dependentes ficam desabilitados até o parâmetro-pai ser ligado.
  await expect(controle, `O parâmetro ${parametro} está desabilitado (depende de outro parâmetro).`).toBeEnabled();
  if (await controle.isChecked() !== valor) {
    await modal.locator(`.toggle:has(#${parametro})`).click();
  }
  await expect(controle).toBeChecked({ checked: valor });
}

/**
 * Aguarda o aviso de sucesso do SGE. No sandbox ele é um diálogo com botão Ok que bloqueia a tela até
 * ser confirmado; na homologação é só um toast. Confirma o Ok quando ele existir.
 */
export async function confirmarAvisoSucessoPermissaoPonto(page: Page, mensagem: string): Promise<void> {
  const aviso = page.getByText(mensagem, { exact: true });
  await expect(aviso).toBeVisible({ timeout: 20000 });
  const ok = page.getByRole('dialog').getByRole('button', { name: 'Ok', exact: true });
  if (await ok.isVisible()) {
    await ok.click();
    await expect(ok).toBeHidden({ timeout: 15000 });
  }
}

export async function fecharModalPermissaoPonto(page: Page): Promise<void> {
  const modal = modalPermissaoPonto(page);
  await getByRoleSge(modal, 'button', { name: /Fechar|Cancelar/ }).click();
  await expect(modal).toBeHidden({ timeout: 15000 });
}

/**
 * Menor sequência >= `inicio` cuja descrição ainda não existe na consulta. Permissões não podem ser
 * excluídas (só inativadas), então a automação nunca reutiliza um nome já cadastrado.
 */
export async function proximaSequenciaLivrePermissaoPonto(
  page: Page,
  options: BuildPermissaoPontoOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { descricao } = buildPermissaoPonto(options, sequencia);
    await pesquisarPermissaoPonto(page, descricao);
    if (await linhaPermissaoPonto(page, descricao).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Informe outra base em "descricao" no dados_permissao_ponto.json.',
  );
}
