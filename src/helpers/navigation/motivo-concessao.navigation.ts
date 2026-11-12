import { expect, type Locator, type Page } from '@playwright/test';
import { buildMotivoConcessao, type BuildMotivoConcessaoOptions } from '../../factories/motivo-concessao.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const TITULO_CONSULTA = /Consulta de Motivos de Concessão/i;
const TITULO_FORMULARIO = /(Adicionar|Editar) Motivo de Concessão/i;
const ROTA = '/motivodeconcessao';
const LIMITE_BUSCA_SEQUENCIA = 200;

function main(page: Page): Locator {
  return page.locator('#main');
}

export function formularioMotivoConcessao(page: Page): Locator {
  return page.locator('#form_motivo');
}

export function tituloConsultaMotivoConcessao(page: Page): Locator {
  return main(page).locator('h4').filter({ hasText: TITULO_CONSULTA });
}

/** Navega pelo menu visível Cadastro > Motivos de Concessão. */
export async function navegarParaConsultaMotivoConcessao(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = tituloConsultaMotivoConcessao(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');

  if (await titulo.isVisible()) {
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  // Dentro do formulário (adicionar/editar), o botão Voltar retorna à consulta.
  const formulario = formularioMotivoConcessao(page);
  if (await formulario.isVisible()) {
    await getByRoleSge(formulario, 'button', { name: /Voltar/ }).click();
    await expect(titulo).toBeVisible({ timeout: 20000 });
    await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  // O nome acessível de Cadastro vem com glifos de ícone antes e depois do texto.
  const cadastro = nav.getByRole('link', { name: /^\W*Cadastro\W*$/ }).first();
  const destino = nav.getByRole('link', { name: 'Motivos de Concessão', exact: true });

  await expect(cadastro).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible()) await cadastro.click();
  await expect(destino).toBeVisible({ timeout: 15000 });

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Motivos de Concessão retornou HTTP ${resposta.status()}.`);
  }

  await waitForSgeLoaders(page);
  await expect(titulo).toBeVisible({ timeout: 30000 });
  await pesquisa.waitFor({ state: 'visible', timeout: 20000 });
}

/** Abre o formulário "Adicionar Motivo de Concessão" a partir da consulta. */
export async function abrirFormularioAdicionarMotivoConcessao(page: Page): Promise<void> {
  const formulario = formularioMotivoConcessao(page);
  await navegarParaConsultaMotivoConcessao(page);
  const adicionar = getByRoleSge(main(page), 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  await expect(getByRoleSge(main(page), 'heading', { name: /Adicionar Motivo de Concessão/i })).toBeVisible({ timeout: 15000 });
  await expect(formulario.locator('#Titulo')).toBeVisible();
  await expect(formulario.locator('#Descricao')).toBeVisible();
}

export async function pesquisarMotivoConcessao(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaMotivoConcessao(page);
  const conteudo = main(page);
  const pesquisa = conteudo.locator('#searchTerm:visible');
  const botaoPesquisar = conteudo.locator('form:has(#searchTerm) button[type="submit"]');

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
    throw new Error(`A pesquisa de Motivos de Concessão retornou HTTP ${resposta.status()}.`);
  }
  await waitForSgeLoaders(page);
  await expect(conteudo.locator('#grid table:not([data-grade-anterior])')).toBeVisible({ timeout: 15000 });
}

/** Linha da grade cujo título é exatamente `titulo` (a pesquisa é por trecho). */
export function linhaMotivoConcessao(page: Page, titulo: string): Locator {
  return main(page)
    .locator('#grid table tbody tr')
    .filter({ has: page.getByRole('cell', { name: titulo, exact: true }) });
}

/** Ícone da coluna Ativo (última coluna); a coluna Entrega Definitiva usa os mesmos ícones. */
export function situacaoMotivoConcessao(linha: Locator, situacao: 'Ativo' | 'Inativo'): Locator {
  return linha.locator('td').last().locator(`i[title="${situacao}"]`);
}

/** Abre o formulário de edição clicando no título da linha (a grade não tem lixeira). */
export async function abrirEdicaoMotivoConcessao(page: Page, titulo: string): Promise<void> {
  const formulario = formularioMotivoConcessao(page);
  const linha = linhaMotivoConcessao(page, titulo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await linha.getByRole('cell', { name: titulo, exact: true }).click();

  await expect(getByRoleSge(main(page), 'heading', { name: /Editar Motivo de Concessão/i })).toBeVisible({ timeout: 20000 });
  await expect(formulario.locator('#Titulo')).toHaveValue(titulo, { timeout: 15000 });
}

/** Define o toggle (`Ativo` ou `EntregaDefinitiva`) pelo controle visível; confirma o estado depois do clique. */
export async function definirToggleMotivoConcessao(
  page: Page,
  toggle: 'Ativo' | 'EntregaDefinitiva',
  valor: boolean,
): Promise<void> {
  const formulario = formularioMotivoConcessao(page);
  const controle = formulario.locator(`#${toggle}`);
  if (await controle.isChecked() !== valor) {
    await formulario.locator(`label.checkbox:has(#${toggle})`).click();
  }
  await expect(controle).toBeChecked({ checked: valor });
}

export async function salvarMotivoConcessao(page: Page): Promise<void> {
  const salvar = formularioMotivoConcessao(page).locator('button[type="submit"]');
  await expect(salvar).toBeVisible();
  await salvar.click();
}

/**
 * Aguarda o aviso de sucesso do SGE e o retorno à consulta. No sandbox o aviso pode ser um diálogo
 * com botão Ok; confirma o Ok quando ele existir.
 */
export async function confirmarSucessoMotivoConcessao(page: Page, titulo: string): Promise<void> {
  const sucesso = page.getByText(/O motivo foi salvo com sucesso/);
  const atencao = page.getByText(/Atenção!/);
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible()) {
    const detalhe = (await atencao.first().innerText()).replace(/\s+/g, ' ').trim();
    throw new Error(`O SGE não aceitou o Motivo de Concessão "${titulo}": ${detalhe}`);
  }
  const ok = page.getByRole('dialog').getByRole('button', { name: 'Ok', exact: true });
  if (await ok.isVisible()) {
    await ok.click();
    await expect(ok).toBeHidden({ timeout: 15000 });
  }
  await expect(tituloConsultaMotivoConcessao(page)).toBeVisible({ timeout: 20000 });
}

/**
 * Menor sequência >= `inicio` cujo título ainda não existe na consulta. Motivos não podem ser
 * excluídos (só inativados) e o SGE recusa título repetido, então a automação nunca reutiliza um nome.
 */
export async function proximaSequenciaLivreMotivoConcessao(
  page: Page,
  options: BuildMotivoConcessaoOptions,
  inicio = 1,
): Promise<number> {
  for (let sequencia = inicio; sequencia < inicio + LIMITE_BUSCA_SEQUENCIA; sequencia++) {
    const { titulo } = buildMotivoConcessao(options, sequencia);
    await pesquisarMotivoConcessao(page, titulo);
    if (await linhaMotivoConcessao(page, titulo).count() === 0) return sequencia;
  }
  throw new Error(
    `Nenhuma sequência livre nas ${LIMITE_BUSCA_SEQUENCIA} tentativas a partir de ${inicio}. `
    + 'Informe outra base em "titulo" no dados_motivo_concessao.json.',
  );
}
