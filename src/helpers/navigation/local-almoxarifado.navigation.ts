import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildLocalAlmoxarifado,
  type BuildLocalAlmoxarifadoOptions,
} from '../../factories/local-almoxarifado.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

// O nome do título traz o glifo do ícone antes do texto; "Editar local"/"Adicionar local" não casam (L minúsculo).
const TITULO_CONSULTA = /\bLocal$/;
const ROTA = '/localalmoxarifado';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaLocalAlmoxarifado(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

/** Navega pelo menu visível Almoxarifado > Cadastros > Local (há outro "Local" em outro menu). */
export async function navegarParaConsultaLocalAlmoxarifado(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaLocalAlmoxarifado(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  // O nome acessível do link inclui o glifo do ícone antes do texto; por isso o regex não é ancorado.
  const almoxarifado = nav.getByRole('link', { name: /Almoxarifado/ }).first();
  const itemAlmoxarifado = nav
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /Almoxarifado/ }) })
    .first();
  const cadastros = itemAlmoxarifado.getByRole('link', { name: /^Cadastros\b/ });
  const itemCadastros = itemAlmoxarifado
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /^Cadastros\b/ }) })
    .first();
  const destino = itemCadastros.getByRole('link', { name: 'Local', exact: true });

  await expect(almoxarifado).toBeVisible({ timeout: 15000 });
  if (!await cadastros.isVisible()) await almoxarifado.click();
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
    throw new Error(`A consulta de Local retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarLocalAlmoxarifado(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar local/i });
  if (await formulario.isVisible()) {
    await conteudo.locator('#Nome').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaLocalAlmoxarifado(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  await conteudo.locator('#Nome').waitFor({ state: 'visible', timeout: 15000 });
  await getByRoleSge(conteudo, 'button', { name: /Salvar/i }).waitFor({ state: 'visible', timeout: 15000 });
}

export async function voltarParaConsultaLocalAlmoxarifado(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(tituloConsultaLocalAlmoxarifado(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

export async function pesquisarLocalAlmoxarifado(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaLocalAlmoxarifado(page);
  const conteudo = main(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');
  const botaoPesquisar = conteudo.locator('#btnSubmitSearch:visible');

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
    throw new Error(`A pesquisa de Local retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Linha da grade cujo nome é exatamente `nome` (a pesquisa é por trecho). */
export function linhaLocalAlmoxarifado(page: Page, nome: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByText(nome, { exact: true }) });
}

/** Abre a edição clicando no nome da linha (a grade não tem lixeira nem botão de editar). */
export async function abrirEdicaoLocalAlmoxarifado(page: Page, nome: string): Promise<void> {
  const conteudo = main(page);
  const linha = linhaLocalAlmoxarifado(page, nome);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByText(nome, { exact: true }).click();

  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar local/i })).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#Nome')).toHaveValue(nome, { timeout: 15000 });
}

/**
 * Menor sequência >= `inicio` cujo nome ainda não existe na consulta. O SGE aceita nomes
 * repetidos (observado na exploração), o que tornaria conferência e exclusão ambíguas.
 */
export async function proximaSequenciaLivreLocalAlmoxarifado(
  page: Page,
  options: BuildLocalAlmoxarifadoOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { nome } = buildLocalAlmoxarifado(options, sequencia);
    await pesquisarLocalAlmoxarifado(page, nome);
    if (await linhaLocalAlmoxarifado(page, nome).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos registros QAAUTO de Local.',
  );
}

export async function confirmarExclusaoLocalAlmoxarifado(page: Page): Promise<void> {
  await expect(page.getByText('Tem certeza que deseja excluir?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
}
