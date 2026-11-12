import { expect, type Page } from '@playwright/test';
import { buildDocumentoCurricular, type BuildDocumentoCurricularOptions, type DocumentoCurricularData } from '../factories/documento-curricular.factory';
import { abrirEdicaoDocumentoCurricular, linhaDocumentoCurricular, navegarParaAdicionarDocumentoCurricular, pesquisarDocumentoCurricular } from '../helpers/navigation/documento-curricular.navigation';
import { adicionarAnoComponentesDocumento, adicionarEstruturaDocumento, abrirAbaDocumento, salvarDocumento, verificarComponentesDocumento } from '../helpers/documento-curricular-form.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface DocumentoCurricularCriado extends DocumentoCurricularData { url: string }

/** Cria, configura e reabre o documento para confirmar persistência das estruturas e dos componentes. */
export async function criarDocumentoCurricular(page: Page, options: BuildDocumentoCurricularOptions = {}, sequencia = 1): Promise<DocumentoCurricularCriado> {
  const dados = buildDocumentoCurricular(options, sequencia);
  console.log(`[Documento Curricular] Criando ${dados.descricao}, composição ${dados.composicaoEnsino}.`);
  await navegarParaAdicionarDocumentoCurricular(page);
  await page.locator('#main #Descricao').fill(dados.descricao);
  await page.locator('#s2id_ComposicaoEnsinoId > .select2-choice').click();
  const composicao = getByRoleSge(page.locator('#select2-drop:visible'), 'option', { name: dados.composicaoEnsino, exact: true });
  await expect(composicao).toBeVisible();
  await composicao.click();
  const [resposta] = await Promise.all([
    page.waitForResponse(r => new URL(r.url()).pathname.toLowerCase() === '/documentocurricular/posteditar' && r.request().method() === 'POST'),
    page.locator('#btnSalvarDocumentoCurricular').click(),
  ]);
  expect(resposta.ok()).toBe(true);
  const formulario = page.locator('#main');
  const editar = getByRoleSge(formulario, 'heading', { name: /Editar Documento Curricular/i });
  const alerta = page.locator('.swal2-popup:visible').filter({ hasText: /Atenção|Erro|não é possível|já existe/i });
  await expect(editar.or(alerta)).toBeVisible();
  if (await alerta.isVisible()) throw new Error(`O SGE não criou o documento na composição ${dados.composicaoEnsino}: ${(await alerta.innerText()).trim()}`);
  await expect(editar).toBeVisible();
  await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao);
  await expect(formulario.locator('#ComposicaoEnsino')).toHaveValue(dados.composicaoEnsino);
  const ativo = formulario.locator('#Ativo');
  if (await ativo.isChecked() !== (dados.ativo === 'Sim')) await formulario.locator('.toggle:has(#Ativo)').click();
  await expect(ativo).toBeChecked({ checked: dados.ativo === 'Sim' });
  for (const estrutura of dados.estruturas) await adicionarEstruturaDocumento(page, estrutura);
  await salvarDocumento(page);
  const componentes = await adicionarAnoComponentesDocumento(page, dados);
  await salvarDocumento(page);
  await pesquisarDocumentoCurricular(page, dados.descricao);
  await expect(linhaDocumentoCurricular(page, dados.descricao)).toHaveCount(1);
  await abrirEdicaoDocumentoCurricular(page, dados.descricao);
  await abrirAbaDocumento(page, 'Estrutura');
  for (const estrutura of dados.estruturas) {
    await expect(page.locator('#div-itens-estrutura-partial').getByText(estrutura.descricao, { exact: true })).toBeVisible();
  }
  await verificarComponentesDocumento(page, dados.anoEscolar, componentes);
  await pesquisarDocumentoCurricular(page, dados.descricao);
  return { ...dados, componentes, componente: componentes[0], url: page.url() };
}

