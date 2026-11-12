import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildDependenciaFisica,
  type BuildDependenciaFisicaOptions,
} from '../../factories/dependencia-fisica.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Dependência Física/i;
const ROTA = '/dependenciafisica';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaDependenciaFisica(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

/** Navega pelo menu visível Infraestrutura > Dependência Física. */
export async function navegarParaConsultaDependenciaFisica(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaDependenciaFisica(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const infraestrutura = nav.getByRole('link', { name: /Infraestrutura/ }).first();
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemInfraestrutura = nav
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /Infraestrutura/ }) });
  const destino = itemInfraestrutura.getByRole('link', { name: 'Dependência Física', exact: true });

  await expect(infraestrutura).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible()) await infraestrutura.click();
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Dependência Física retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarDependenciaFisica(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar Dependência Física/i });
  if (await formulario.isVisible()) {
    await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaDependenciaFisica(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  await conteudo.locator('#Descricao').waitFor({ state: 'visible', timeout: 15000 });
  await getByRoleSge(conteudo, 'button', { name: /Salvar/i }).waitFor({ state: 'visible', timeout: 15000 });
}

export async function voltarParaConsultaDependenciaFisica(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(tituloConsultaDependenciaFisica(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

export async function pesquisarDependenciaFisica(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaDependenciaFisica(page);
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
    throw new Error(`A pesquisa de Dependência Física retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Linha da grade cuja descrição é exatamente `descricao` (a pesquisa é por trecho). */
export function linhaDependenciaFisica(page: Page, descricao: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByText(descricao, { exact: true }) });
}

/** Abre a edição clicando na descrição da linha (a grade não tem lixeira nem botão de editar). */
export async function abrirEdicaoDependenciaFisica(page: Page, descricao: string): Promise<void> {
  const conteudo = main(page);
  const linha = linhaDependenciaFisica(page, descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByText(descricao, { exact: true }).click();

  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar Dependência Física/i }))
    .toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#Descricao')).toHaveValue(descricao, { timeout: 15000 });
  await expect(conteudo.locator('#s2id_TipoDeDependenciaId:not(.select2-container-disabled)')).toBeVisible();
}

/**
 * Menor sequência >= `inicio` cuja descrição ainda não existe na consulta. O SGE aceita descrições
 * repetidas (verificado na exploração), o que tornaria conferência e exclusão ambíguas; nada é
 * excluído aqui.
 */
export async function proximaSequenciaLivreDependenciaFisica(
  page: Page,
  options: BuildDependenciaFisicaOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { descricao } = buildDependenciaFisica(options, sequencia);
    await pesquisarDependenciaFisica(page, descricao);
    if (await linhaDependenciaFisica(page, descricao).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos registros QAAUTO de Dependência Física.',
  );
}

export async function confirmarExclusaoDependenciaFisica(page: Page): Promise<void> {
  await expect(page.getByText('Tem certeza que deseja excluir?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
}
