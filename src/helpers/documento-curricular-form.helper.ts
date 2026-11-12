import { expect, type Page } from '@playwright/test';
import type { DocumentoCurricularData, EstruturaDocumentoCurricular } from '../factories/documento-curricular.factory';
import { aguardarCarregamentoDocumentoCurricular } from './navigation/documento-curricular.navigation';
import { getByRoleSge } from './sge-locators.helper';

export async function abrirAbaDocumento(page: Page, aba: 'Estrutura' | 'Componentes'): Promise<void> {
  const controle = page.locator(`#formDocumentoCurricular a[href="#tab${aba}"]`);
  await expect(controle).toBeVisible();
  await controle.click();
  await expect(page.locator(`#tab${aba}`)).toBeVisible();
}

export async function definirSwitchDocumento(page: Page, id: string, valor: 'Sim' | 'Não'): Promise<void> {
  const modal = page.locator('.modal:visible');
  const input = modal.locator(`#${id}`);
  const esperado = valor === 'Sim';
  if (await input.isChecked() !== esperado) await modal.locator(`.toggle:has(#${id})`).click();
  await expect(input).toBeChecked({ checked: esperado });
}

export async function salvarDocumento(page: Page): Promise<void> {
  const formularioAntes = await page.locator('#formDocumentoCurricular').elementHandle();
  const [resposta] = await Promise.all([
    page.waitForResponse(r => new URL(r.url()).pathname.toLowerCase() === '/documentocurricular/posteditar' && r.request().method() === 'POST'),
    page.locator('#btnSalvarDocumentoCurricular').click(),
  ]);
  expect(resposta.ok()).toBe(true);
  const feedback = page.locator('.swal2-popup:visible');
  await expect(feedback).toContainText('O documento curricular foi salvo.');
  await getByRoleSge(feedback, 'button', { name: 'Ok', exact: true }).click();
  await expect(feedback).toBeHidden();
  await page.waitForFunction(elemento => !elemento.isConnected, formularioAntes);
  await formularioAntes.dispose();
  await aguardarCarregamentoDocumentoCurricular(page);
  await expect(getByRoleSge(page.locator('#main'), 'heading', { name: /Editar Documento Curricular/i })).toBeVisible();
}

export async function adicionarEstruturaDocumento(page: Page, estrutura: EstruturaDocumentoCurricular): Promise<void> {
  await abrirAbaDocumento(page, 'Estrutura');
  const grid = page.locator('#div-itens-estrutura-partial');
  const adicionar = grid.locator('a[onclick="abraModalEstrutura(0)"]');
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  const modal = page.locator('.modal:visible');
  await expect(getByRoleSge(modal, 'heading', { name: 'Estrutura do Documento Curricular', exact: true })).toBeVisible();
  await modal.locator('#Descricao').fill(estrutura.descricao);
  await definirSwitchDocumento(page, 'Ativo', estrutura.ativo);
  await modal.locator('#s2id_Codigo > .select2-choice').click();
  const opcao = getByRoleSge(page.locator('#select2-drop:visible'), 'option', { name: estrutura.possuiCodigo, exact: true });
  await expect(opcao).toBeVisible();
  await opcao.click();
  const [resposta] = await Promise.all([
    page.waitForResponse(r => new URL(r.url()).pathname.toLowerCase() === '/estruturadodocumentocurricular/post' && r.request().method() === 'POST'),
    getByRoleSge(modal, 'button', { name: /Salvar$/i }).click(),
  ]);
  expect(resposta.ok()).toBe(true);
  await expect(modal).toBeHidden();
  const feedback = page.locator('.swal2-popup:visible');
  await expect(feedback).toContainText('O item da estrutura foi adicionado.');
  await getByRoleSge(feedback, 'button', { name: 'Ok', exact: true }).click();
  await expect(feedback).toBeHidden();
  await expect(grid.getByText(estrutura.descricao, { exact: true })).toBeVisible();
  console.log(`[Documento Curricular] Estrutura incluída: ${estrutura.descricao}.`);
}

export async function adicionarAnoComponentesDocumento(page: Page, documento: DocumentoCurricularData): Promise<string[]> {
  await abrirAbaDocumento(page, 'Componentes');
  const adicionar = page.locator('#divGrupo button');
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  const modal = page.locator('.modal:visible');
  await expect(getByRoleSge(modal, 'heading', { name: /Configurar Documento Curricular/i })).toBeVisible();
  await modal.locator('#s2id_SerieId > .select2-choice').click();
  const ano = getByRoleSge(page.locator('#select2-drop:visible'), 'option', { name: documento.anoEscolar, exact: true });
  await expect(ano, `Ano escolar configurado: ${documento.anoEscolar}`).toBeVisible();
  const [respostaAnos] = await Promise.all([
    page.waitForResponse(r => new URL(r.url()).pathname.toLowerCase() === '/documentocurricular/obtenhadisciplinasdiponiveis' && r.request().method() === 'GET'),
    ano.click(),
  ]);
  expect(respostaAnos.ok()).toBe(true);
  await aguardarCarregamentoDocumentoCurricular(page);
  const entrada = modal.locator('#s2id_Componentes input.select2-input');
  await expect(entrada).toBeVisible();
  await entrada.click();
  const opcoes = getByRoleSge(page.locator('#select2-drop:visible'), 'option');
  await expect(opcoes.first()).toBeVisible();
  const nomes = (await opcoes.allTextContents()).map(nome => nome.trim());
  const disponivel = (nome: string) => nomes.includes(nome);
  let componentes = documento.componentes;
  if (!componentes.every(disponivel)) {
    if (!documento.componenteAlternativo || !disponivel(documento.componenteAlternativo)) {
      throw new Error(`Componentes indisponíveis para ${documento.anoEscolar}: ${componentes.filter(nome => !disponivel(nome)).join(', ')}.`);
    }
    componentes = [documento.componenteAlternativo];
    console.log(`[Documento Curricular] Usando componente alternativo configurado: ${componentes[0]}.`);
  }
  for (const [indice, componente] of componentes.entries()) {
    if (indice > 0) await entrada.click();
    const opcao = getByRoleSge(page.locator('#select2-drop:visible'), 'option', { name: componente, exact: true });
    await expect(opcao).toBeVisible();
    await opcao.click();
    await expect(modal.locator('#s2id_Componentes .select2-search-choice').filter({ hasText: componente })).toBeVisible();
  }
  const formularioAntes = await page.locator('#formDocumentoCurricular').elementHandle();
  const [resposta] = await Promise.all([
    page.waitForResponse(r => new URL(r.url()).pathname.toLowerCase() === '/documentocurricular/postmodalcomponentedodocumentocurricular' && r.request().method() === 'POST'),
    getByRoleSge(modal, 'button', { name: /Adicionar$/i }).click(),
  ]);
  expect(resposta.ok()).toBe(true);
  await expect(modal).toBeHidden();
  await page.waitForFunction(elemento => !elemento.isConnected, formularioAntes);
  await formularioAntes.dispose();
  await verificarComponentesDocumento(page, documento.anoEscolar, componentes);
  console.log(`[Documento Curricular] Ano ${documento.anoEscolar}: ${componentes.join(', ')}.`);
  return componentes;
}

export async function verificarComponentesDocumento(page: Page, anoEscolar: string, componentes: string[]): Promise<void> {
  await abrirAbaDocumento(page, 'Componentes');
  const anos = page.locator('#divGrupo li');
  await expect(anos).toHaveCount(1);
  await expect(anos).toContainText(anoEscolar);
  await anos.locator('a').click();
  const linhas = page.locator('#tabComponentes table:visible tbody tr');
  await expect(linhas).toHaveCount(componentes.length);
  for (const componente of componentes) await expect(linhas.getByText(componente, { exact: true })).toBeVisible();
}

