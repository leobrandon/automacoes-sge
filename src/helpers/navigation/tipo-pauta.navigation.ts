import { expect, type Locator, type Page } from '@playwright/test';
import { buildTipoPauta, type BuildTipoPautaOptions } from '../../factories/tipo-pauta.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Tipos de Pauta/i;
const ROTA = '/tipodepauta';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function tituloConsultaTipoPauta(page: Page): Locator {
  return getByRoleSge(main(page), 'heading', { name: TITULO_CONSULTA });
}

/** Navega pelo menu visível Acompanhamento/Pautas > Tipos de pauta. */
export async function navegarParaConsultaTipoPauta(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaTipoPauta(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const modulo = nav.getByRole('link', { name: /Acompanhamento\/Pautas/ });
  const destino = nav.getByRole('link', { name: 'Tipos de pauta', exact: true });

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
    throw new Error(`A consulta de Tipos de pauta retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

/** Abre o formulário "Adicionar Tipo de Pauta" e espera os Select2 ficarem prontos. */
export async function navegarParaAdicionarTipoPauta(page: Page): Promise<void> {
  const conteudo = main(page);
  const formulario = getByRoleSge(conteudo, 'heading', { name: /Adicionar Tipo de Pauta/i });
  if (await formulario.isVisible()) {
    await conteudo.locator('#btnSalvarTipoDePauta').waitFor({ state: 'visible', timeout: 15000 });
    return;
  }

  await navegarParaConsultaTipoPauta(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(formulario).toBeVisible({ timeout: 15000 });
  // O SGE mostra o formulário antes de inicializar os Select2; o primeiro precisa estar pronto.
  await conteudo.locator('#s2id_AreaDeAtuacaoDePautaId:not(.select2-container-disabled) .select2-choice')
    .waitFor({ state: 'visible', timeout: 15000 });
  await conteudo.locator('#btnSalvarTipoDePauta').waitFor({ state: 'visible', timeout: 15000 });
}

export async function voltarParaConsultaTipoPauta(page: Page): Promise<void> {
  const conteudo = main(page);
  const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();

  await expect(tituloConsultaTipoPauta(page)).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#searchTerm:visible')).toBeVisible();
}

export async function pesquisarTipoPauta(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaTipoPauta(page);
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
    throw new Error(`A pesquisa de Tipos de pauta retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/**
 * Linha da grade cujo nome é exatamente `nome` (a pesquisa é por trecho: `... 1` casa `... 10`). A comparação
 * ignora maiúsculas: o SGE trata "QAAUTO pauta 2" e "QAAUTO Pauta 2" como o mesmo nome.
 */
export function linhaTipoPauta(page: Page, nome: string): Locator {
  const exato = new RegExp(`^\\s*${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: getByRoleSge(page, 'cell', { name: exato }) });
}

/** Abre a edição clicando no nome da linha (a grade não tem lixeira nem botão de editar). */
export async function abrirEdicaoTipoPauta(page: Page, nome: string): Promise<void> {
  const conteudo = main(page);
  const linha = linhaTipoPauta(page, nome);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await getByRoleSge(linha, 'cell', { name: new RegExp(`^\\s*${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') }).click();

  await expect(getByRoleSge(conteudo, 'heading', { name: /Alterar Tipo de Pauta/i })).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#Nome')).toHaveValue(nome, { timeout: 15000 });
}

/**
 * Menor sequência >= `inicio` cujo nome ainda não existe na consulta. O SGE recusa nome repetido na mesma
 * área de atuação, então o nome é a chave de conferência e de exclusão.
 */
export async function proximaSequenciaLivreTipoPauta(
  page: Page,
  options: BuildTipoPautaOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { nome } = buildTipoPauta(options, sequencia);
    await pesquisarTipoPauta(page, nome);
    if (await linhaTipoPauta(page, nome).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Execute a exclusão dos Tipos de pauta QAAUTO criados por execuções anteriores.',
  );
}

/** Aviso do SGE (SweetAlert) com botão `Ok` ou `Sim`; o `Ok` fecha o diálogo antes de seguir. */
export async function confirmarAvisoTipoPauta(page: Page, nomeBotao: 'Sim' | 'Ok'): Promise<void> {
  const dialogo = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: nomeBotao, exact: true }) });
  await expect(dialogo).toBeVisible({ timeout: 15000 });
  await dialogo.getByRole('button', { name: nomeBotao, exact: true }).click();
  if (nomeBotao === 'Ok') await expect(dialogo).toBeHidden({ timeout: 15000 });
}
