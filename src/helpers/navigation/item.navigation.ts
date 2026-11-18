import { expect, type Locator, type Page } from '@playwright/test';
import { buildItem, type BuildItemOptions } from '../../factories/item.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const ROTA_CONSULTA = '/item';
const TITULO_CONSULTA = /Consulta de Itens/i;
const TITULO_FORMULARIO = /(Cadastro|Alteração) de Item/i;
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function tituloConsultaItem(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

export async function aguardarCarregamentoItem(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Garante que a tela atual é a Consulta de Itens navegando por Cadastro > Item. */
export async function navegarParaConsultaItem(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaItem(page);
  const busca = conteudo.locator('#searchTerm:visible');

  await aguardarCarregamentoItem(page);
  if (await titulo.isVisible()) {
    await expect(busca).toBeVisible({ timeout: 20000 });
    return;
  }

  const formulario = getByRoleSge(conteudo, 'heading', { name: TITULO_FORMULARIO });
  if (await formulario.isVisible()) {
    await voltarParaConsultaItem(page);
    return;
  }

  const nav = page.locator('nav:visible').first();
  const cadastro = nav.getByRole('link', { name: /\bCadastro(?:\s|$)/ }).first();
  const itemCadastro = nav
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /\bCadastro(?:\s|$)/ }) })
    .first();
  const destino = itemCadastro.getByRole('link', { name: 'Item', exact: true });

  if (!(await destino.isVisible())) {
    await expect(cadastro).toBeVisible({ timeout: 15000 });
    await cadastro.click();
  }
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA_CONSULTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Itens retornou HTTP ${resposta.status()}.`);
  }

  await aguardarCarregamentoItem(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await expect(busca).toBeVisible({ timeout: 20000 });
}

/** Abre o formulário Cadastro de Item pelo dropdown "+" -> "Adicionar Item". */
export async function navegarParaAdicionarItem(page: Page): Promise<void> {
  const conteudo = main(page);
  const tituloCadastro = getByRoleSge(conteudo, 'heading', { name: /Cadastro de Item/i });

  if (await tituloCadastro.isVisible()) {
    await expect(conteudo.locator('#Descricao')).toBeVisible({ timeout: 15000 });
    return;
  }

  await navegarParaConsultaItem(page);
  const botaoAdicionar = conteudo.locator('button.dropdown-toggle').first();
  await expect(botaoAdicionar).toBeVisible({ timeout: 15000 });
  await botaoAdicionar.click();

  const opcaoItem = conteudo
    .locator('ul.dropdown-menu a')
    .filter({ hasText: /^\s*Adicionar Item\s*$/ });
  await expect(opcaoItem).toBeVisible({ timeout: 10000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase() === '/item/create'
        && url.searchParams.get('tipoDeItem') === 'Item'
        && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    opcaoItem.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A tela de Cadastro de Item retornou HTTP ${resposta.status()}.`);
  }

  await aguardarCarregamentoItem(page);
  await expect(tituloCadastro).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#Descricao')).toBeVisible({ timeout: 15000 });
  await expect(conteudo.locator('#s2id_GrupoUnidadeDeMedidaId:not(.select2-container-disabled) .select2-choice'))
    .toBeVisible({ timeout: 15000 });
  await expect(conteudo.locator('#s2id_CategoriaGeralId:not(.select2-container-disabled) .select2-choice'))
    .toBeVisible({ timeout: 15000 });
}

/** Retorna do formulário de Item para a tela Consulta de Itens pelo botão Voltar. */
export async function voltarParaConsultaItem(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible({ timeout: 15000 });
  await voltar.click();

  await aguardarCarregamentoItem(page);
  await expect(tituloConsultaItem(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible({ timeout: 15000 });
}

/** Pesquisa pelo termo informado em Consulta de Itens aguardando a atualização da grade. */
export async function pesquisarItem(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaItem(page);
  const conteudo = main(page);
  const busca = conteudo.locator('#searchTerm:visible');
  const botaoPesquisar = conteudo.locator('#btnSubmitSearch:visible');

  await expect(busca).toBeVisible({ timeout: 15000 });
  await busca.fill(termo);
  await expect(botaoPesquisar).toBeVisible({ timeout: 15000 });

  await conteudo.locator('#grid table').evaluateAll((tabelas) => {
    tabelas.forEach((tabela) => tabela.setAttribute('data-grade-anterior', 'true'));
  });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase() === '/item/indexgrid'
        && url.searchParams.get('searchTerm') === termo
        && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A pesquisa de Itens retornou HTTP ${resposta.status()}.`);
  }

  await aguardarCarregamentoItem(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Localiza a linha na grade cuja coluna Descrição (3ª célula) é exatamente igual ao texto informado. */
export function linhaItem(page: Page, descricao: string): Locator {
  const padraoExato = new RegExp(`^\\s*${escaparRegex(descricao)}\\s*$`);
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.locator('td:nth-child(3)').filter({ hasText: padraoExato }) });
}

/** Abre a tela Alteração de Item clicando na célula de descrição da linha encontrada. */
export async function abrirEdicaoItem(page: Page, descricao: string): Promise<void> {
  const conteudo = main(page);
  const linha = linhaItem(page, descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });

  const celulaDescricao = linha.locator('td').nth(2);
  await expect(celulaDescricao).toBeVisible({ timeout: 15000 });
  await celulaDescricao.click();

  await expect(getByRoleSge(conteudo, 'heading', { name: /Alteração de Item/i }))
    .toBeVisible({ timeout: 20000 });
  await aguardarCarregamentoItem(page);
  await expect(conteudo.locator('#Descricao')).toHaveValue(descricao, { timeout: 15000 });
  await expect(conteudo.locator('#btnExcluir')).toBeVisible({ timeout: 15000 });
}

/**
 * Encontra a menor sequência >= `inicio` cuja descrição ainda não existe na grade.
 * O SGE recusa itens com descrição duplicada.
 */
export async function proximaSequenciaLivreItem(
  page: Page,
  options: BuildItemOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { descricao } = buildItem(options, sequencia);
    await pesquisarItem(page, descricao);
    if ((await linhaItem(page, descricao).count()) === 0) {
      return sequencia;
    }
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos registros QAAUTO de Item.',
  );
}
