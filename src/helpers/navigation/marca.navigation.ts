import { expect, type Locator, type Page } from '@playwright/test';
import { buildMarca, type BuildMarcaOptions } from '../../factories/marca.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const ROTA = '/marca';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaMarca(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: /Marcas$/ });
}

export function modalMarca(page: Page): Locator {
  return page.locator('#modalEditar');
}

/** Navega pelo menu visível Cadastro > Marcas. */
export async function navegarParaConsultaMarca(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaMarca(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  // O nome acessível de Cadastro inclui ícones; a expressão evita confundir com "Cadastros Básicos".
  const cadastro = nav.getByRole('link', { name: /Cadastro\s/ });
  const destino = nav.getByRole('link', { name: 'Marcas', exact: true });

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
    throw new Error(`A consulta de Marcas retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

/** Pesquisa por trecho da descrição. A grade exibida antes da pesquisa pode ser resto da tela anterior. */
export async function pesquisarMarca(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaMarca(page);
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
    throw new Error(`A pesquisa de Marcas retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Linha da grade cuja descrição é exatamente `descricao` (a pesquisa é por trecho). */
export function linhaMarca(page: Page, descricao: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByText(descricao, { exact: true }) });
}

export async function navegarParaAdicionarMarca(page: Page): Promise<void> {
  await navegarParaConsultaMarca(page);
  // O botão só tem ícone: o nome acessível vem vazio, então o atributo title é o contrato estável.
  const adicionar = main(page).locator('button[title="Adicionar marca"]');
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await aguardarModalMarca(page);
}

/** Abre o modal de edição pelo botão "Editar Marca" da linha. */
export async function abrirEdicaoMarca(page: Page, descricao: string): Promise<void> {
  const linha = linhaMarca(page, descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const editar = linha.locator('a[title="Editar Marca"]');
  await expect(editar).toBeVisible();
  await editar.click();
  await aguardarModalMarca(page);
  await expect(modalMarca(page).locator('#Descricao')).toHaveValue(descricao, { timeout: 15000 });
}

async function aguardarModalMarca(page: Page): Promise<void> {
  const modal = modalMarca(page);
  await expect(modal).toBeVisible({ timeout: 15000 });
  await expect(modal.locator('#Descricao')).toBeVisible({ timeout: 15000 });
  await expect(modal.locator('#btnSalvar')).toBeVisible({ timeout: 15000 });
}

/** Fecha o modal e aguarda a consulta recarregada. */
export async function fecharModalMarca(page: Page): Promise<void> {
  const modal = modalMarca(page);
  const fechar = modal.locator('.modal-footer').getByRole('button', { name: /Fechar/ });
  await expect(fechar).toBeVisible();
  await fechar.click();
  await expect(modal).toBeHidden({ timeout: 15000 });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0, { timeout: 15000 });
  await waitForSgeLoaders(page);
  await expect(main(page).locator('#searchTerm:visible')).toBeVisible({ timeout: 20000 });
}

/**
 * Menor sequência >= `inicio` cuja descrição ainda não existe na consulta. O SGE recusa
 * descrição repetida; nada é excluído aqui.
 */
export async function proximaSequenciaLivreMarca(
  page: Page,
  options: BuildMarcaOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { descricao } = buildMarca(options, sequencia);
    await pesquisarMarca(page, descricao);
    if (await linhaMarca(page, descricao).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos registros QAAUTO de Marcas.',
  );
}

export async function confirmarExclusaoMarca(page: Page): Promise<void> {
  await expect(page.getByText('Tem certeza que deseja excluir essa Marca?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
}
