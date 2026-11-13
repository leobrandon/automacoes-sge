import { expect, type Locator, type Page } from '@playwright/test';
import { buildAreaAtuacao, type BuildAreaAtuacaoOptions } from '../../factories/area-atuacao.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Áreas de atuação/i;
const ROTA = '/areadeatuacaodepauta';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaAreaAtuacao(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

/** Modal "Adicionar/Editar área de atuação" (fica dentro de `#main`). */
export function modalAreaAtuacao(page: Page): Locator {
  return main(page).locator('#modalAreaDeAtuacao');
}

/** Navega pelo menu visível Acompanhamento/Pautas > Áreas de atuação. */
export async function navegarParaConsultaAreaAtuacao(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaAreaAtuacao(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const modulo = nav.getByRole('link', { name: /Acompanhamento\/Pautas/ });
  const destino = nav.getByRole('link', { name: 'Áreas de atuação', exact: true });

  await expect(modulo).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible()) await modulo.click();
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Áreas de atuação retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

/** Abre o modal de cadastro pelo botão "Adicionar área". */
export async function abrirModalAdicionarAreaAtuacao(page: Page): Promise<Locator> {
  await navegarParaConsultaAreaAtuacao(page);
  const adicionar = getByRoleSge(main(page), 'button', { name: /Adicionar área/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  const modal = modalAreaAtuacao(page);
  await expect(modal).toBeVisible({ timeout: 15000 });
  await expect(modal.locator('#Nome')).toBeVisible({ timeout: 15000 });
  return modal;
}

export async function pesquisarAreaAtuacao(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaAreaAtuacao(page);
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
      return url.pathname.toLowerCase() === `${ROTA}/indexgrid` && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A pesquisa de Áreas de atuação retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/**
 * Linha da grade cuja descrição é exatamente `descricao` (a pesquisa é por trecho: `... 1` casa `... 10`).
 * A comparação ignora maiúsculas: o SGE trata "Area 1" e "area 1" como o mesmo nome.
 */
export function linhaAreaAtuacao(page: Page, descricao: string): Locator {
  const exato = new RegExp(`^\\s*${descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: getByRoleSge(page, 'cell', { name: exato }) });
}

/** Menor sequência >= `inicio` cuja descrição ainda não existe na consulta. */
export async function proximaSequenciaLivreAreaAtuacao(
  page: Page,
  options: BuildAreaAtuacaoOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { descricao } = buildAreaAtuacao(options, sequencia);
    await pesquisarAreaAtuacao(page, descricao);
    if (await linhaAreaAtuacao(page, descricao).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão das Áreas de atuação QAAUTO criadas por execuções anteriores.',
  );
}

/** Aviso do SGE (SweetAlert) com botão `Ok` ou `Sim`; o `Ok` fecha o diálogo antes de seguir. */
export async function confirmarAvisoAreaAtuacao(page: Page, nomeBotao: 'Sim' | 'Ok'): Promise<void> {
  const dialogo = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: nomeBotao, exact: true }) });
  await expect(dialogo).toBeVisible({ timeout: 15000 });
  await dialogo.getByRole('button', { name: nomeBotao, exact: true }).click();
  if (nomeBotao === 'Ok') await expect(dialogo).toBeHidden({ timeout: 15000 });
}
