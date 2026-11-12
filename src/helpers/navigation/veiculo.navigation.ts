import { expect, type Locator, type Page } from '@playwright/test';
import { buildVeiculo, type BuildVeiculoOptions } from '../../factories/veiculo.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Veículos/i;
const ROTA = '/veiculo';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaVeiculo(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

/** Navega pelo menu visível Transporte Escolar > Cadastros > Veículo. */
export async function navegarParaConsultaVeiculo(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaVeiculo(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const transporte = nav.getByRole('link', { name: /Transporte Escolar/ }).first();
  const itemTransporte = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /Transporte Escolar/ }) });
  const cadastros = itemTransporte.getByRole('link', { name: /^Cadastros\b/ }).first();
  const destino = itemTransporte.getByRole('link', { name: 'Veículo', exact: true });

  await expect(transporte).toBeVisible({ timeout: 15000 });
  if (!await cadastros.isVisible()) await transporte.click();
  await expect(cadastros).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible()) await cadastros.click();
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Veículos retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarVeiculo(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar Veículo/i });
  if (await formulario.isVisible()) {
    await conteudo.locator('#Modelo').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaVeiculo(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  await conteudo.locator('#Modelo').waitFor({ state: 'visible', timeout: 15000 });
  await getByRoleSge(conteudo, 'button', { name: /Salvar/i }).waitFor({ state: 'visible', timeout: 15000 });
}

export async function voltarParaConsultaVeiculo(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(tituloConsultaVeiculo(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

export async function pesquisarVeiculo(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaVeiculo(page);
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
    throw new Error(`A pesquisa de Veículos retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Linha da grade cujo Modelo/Descrição é exatamente `modelo` (a pesquisa é por trecho). */
export function linhaVeiculo(page: Page, modelo: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByText(modelo, { exact: true }) });
}

/** Abre a edição clicando no modelo da linha (a grade não tem lixeira nem botão de editar). */
export async function abrirEdicaoVeiculo(page: Page, modelo: string): Promise<void> {
  const conteudo = main(page);
  const linha = linhaVeiculo(page, modelo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByText(modelo, { exact: true }).click();

  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar Veículo/i })).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#Modelo')).toHaveValue(modelo, { timeout: 15000 });
}

/**
 * Menor sequência >= `inicio` cujo modelo ainda não existe na consulta (a placa deriva da sequência).
 * Nada é excluído aqui.
 */
export async function proximaSequenciaLivreVeiculo(
  page: Page,
  options: BuildVeiculoOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { modelo } = buildVeiculo(options, sequencia);
    await pesquisarVeiculo(page, modelo);
    if (await linhaVeiculo(page, modelo).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos registros QAAUTO de Veículos.',
  );
}

export async function confirmarExclusaoVeiculo(page: Page): Promise<void> {
  await expect(page.getByText('Tem certeza que deseja excluir?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
}
