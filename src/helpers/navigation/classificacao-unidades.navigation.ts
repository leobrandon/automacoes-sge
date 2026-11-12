import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildClassificacaoUnidades,
  type BuildClassificacaoUnidadesOptions,
} from '../../factories/classificacao-unidades.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const ROTA = '/classificacaodeunidades';
const LIMITE_BUSCA_SEQUENCIA = 200;
// A nomenclatura de "Unidade Escolar" é configurável e muda só o texto exibido (menu, título, campos).
const NOME_MENU = /^Classificação de Unidades? (Escolar|Educacionais?)$/;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaClassificacaoUnidades(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: /Classificação de Unidades? (Escolar|Educacionais?)$/ });
}

export function modalClassificacaoUnidades(page: Page): Locator {
  return page.locator('#modalClassificacaoDeUnidades');
}

/** Navega pelo menu visível Cadastro > Classificação de Unidades Educacionais. */
export async function navegarParaConsultaClassificacaoUnidades(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaClassificacaoUnidades(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  // O nome acessível de Cadastro inclui ícones; a expressão evita confundir com "Cadastros Básicos".
  const cadastro = nav.getByRole('link', { name: /Cadastro\s/ });
  const destino = nav.getByRole('link', { name: NOME_MENU });

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
    throw new Error(`A consulta de Classificação de Unidades retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

/** Pesquisa por trecho da descrição. O filtro "Apenas ativos" fica no padrão (ligado). */
export async function pesquisarClassificacaoUnidades(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaClassificacaoUnidades(page);
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

  // A pesquisa usa GET neste cadastro; não restringe o método.
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase() === `${ROTA}/indexgrid`;
    }, { timeout: 20000 }),
    botaoPesquisar.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A pesquisa de Classificação de Unidades retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Linha da grade cuja descrição é exatamente `descricao` (a pesquisa é por trecho). */
export function linhaClassificacaoUnidades(page: Page, descricao: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByText(descricao, { exact: true }) });
}

async function aguardarModal(page: Page): Promise<void> {
  const modal = modalClassificacaoUnidades(page);
  await expect(modal).toBeVisible({ timeout: 15000 });
  await expect(modal.locator('#Descricao')).toBeVisible({ timeout: 15000 });
  await expect(modal.locator('#btnSalvar')).toBeVisible({ timeout: 15000 });
}

export async function navegarParaAdicionarClassificacaoUnidades(page: Page): Promise<void> {
  await navegarParaConsultaClassificacaoUnidades(page);
  const adicionar = getByRoleSge(main(page), 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await aguardarModal(page);
}

/** Abre o modal de edição pelo botão "Editar" da linha. */
export async function abrirEdicaoClassificacaoUnidades(page: Page, descricao: string): Promise<void> {
  const linha = linhaClassificacaoUnidades(page, descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  // O botão só tem ícone: o atributo title é o contrato estável.
  const editar = linha.locator('a[title="Editar"]');
  await expect(editar).toBeVisible();
  await editar.click();
  await aguardarModal(page);
  await expect(modalClassificacaoUnidades(page).locator('#Descricao')).toHaveValue(descricao, { timeout: 15000 });
}

export async function fecharModalClassificacaoUnidades(page: Page): Promise<void> {
  const modal = modalClassificacaoUnidades(page);
  const fechar = modal.locator('.modal-footer').getByRole('button', { name: /Fechar/ });
  await expect(fechar).toBeVisible();
  await fechar.click();
  await expect(modal).toBeHidden({ timeout: 15000 });
  await expect(page.locator('.modal-backdrop')).toHaveCount(0, { timeout: 15000 });
}

/** Confirma o aviso do SGE (botão "Ok") e aguarda o desaparecimento do alerta. */
export async function confirmarAvisoClassificacaoUnidades(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(page.locator('.swal2-container')).toHaveCount(0, { timeout: 15000 });
}

/**
 * Menor sequência >= `inicio` cuja descrição ainda não existe na consulta. O SGE recusa
 * descrição repetida; nada é excluído aqui.
 */
export async function proximaSequenciaLivreClassificacaoUnidades(
  page: Page,
  options: BuildClassificacaoUnidadesOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { descricao } = buildClassificacaoUnidades(options, sequencia);
    await pesquisarClassificacaoUnidades(page, descricao);
    if (await linhaClassificacaoUnidades(page, descricao).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos registros QAAUTO de Classificação de Unidades.',
  );
}

export async function confirmarExclusaoClassificacaoUnidades(page: Page): Promise<void> {
  await expect(page.getByText('Esta ação irá excluir a classificação, deseja continuar?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  const confirmar = page.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
}
