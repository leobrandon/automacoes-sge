import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildDepreciacaoPatrimonio,
  type BuildDepreciacaoPatrimonioOptions,
} from '../../factories/depreciacao-patrimonio.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Depreciação/i;
const ROTA = '/depreciacaopatrimonio';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaDepreciacaoPatrimonio(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

/** Navega pelo menu visível Patrimônio > Depreciação. */
export async function navegarParaConsultaDepreciacaoPatrimonio(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaDepreciacaoPatrimonio(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  // O submenu também se chama "Patrimônio"; o primeiro link na ordem do DOM é o do módulo.
  const patrimonio = nav.getByRole('link', { name: /Patrimônio/ }).first();
  const destino = nav.getByRole('link', { name: 'Depreciação', exact: true });

  await expect(patrimonio).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible()) await patrimonio.click();
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Depreciação retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarDepreciacaoPatrimonio(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar Depreciação/i });
  if (await formulario.isVisible()) {
    await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaDepreciacaoPatrimonio(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
  await conteudo.locator('#btnSalvar').waitFor({ state: 'visible', timeout: 15000 });
}

export async function voltarParaConsultaDepreciacaoPatrimonio(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(tituloConsultaDepreciacaoPatrimonio(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

export async function pesquisarDepreciacaoPatrimonio(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaDepreciacaoPatrimonio(page);
  const conteudo = main(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');
  const botaoPesquisar = conteudo.locator('.input-group-btn button:visible');

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
    throw new Error(`A pesquisa de Depreciação retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Linha da grade cuja descrição é exatamente `descricao` (a pesquisa é por trecho). */
export function linhaDepreciacaoPatrimonio(page: Page, descricao: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByRole('cell', { name: descricao, exact: true }) });
}

/** Abre a edição clicando na descrição da linha (a grade não tem lixeira nem botão de editar). */
export async function abrirEdicaoDepreciacaoPatrimonio(page: Page, descricao: string): Promise<void> {
  const conteudo = main(page);
  const linha = linhaDepreciacaoPatrimonio(page, descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByRole('cell', { name: descricao, exact: true }).click();

  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar Depreciação/i })).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#Descricao')).toHaveValue(descricao, { timeout: 15000 });
}

/**
 * Menor sequência >= `inicio` cuja descrição ainda não existe na consulta. O SGE aceita
 * descrições repetidas (observado na exploração), o que tornaria conferência e exclusão ambíguas.
 */
export async function proximaSequenciaLivreDepreciacaoPatrimonio(
  page: Page,
  options: BuildDepreciacaoPatrimonioOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { descricao } = buildDepreciacaoPatrimonio(options, sequencia);
    await pesquisarDepreciacaoPatrimonio(page, descricao);
    if (await linhaDepreciacaoPatrimonio(page, descricao).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos registros QAAUTO de Depreciação.',
  );
}

export async function confirmarExclusaoDepreciacaoPatrimonio(page: Page): Promise<void> {
  await expect(page.getByText('Tem certeza que deseja excluir?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
}
