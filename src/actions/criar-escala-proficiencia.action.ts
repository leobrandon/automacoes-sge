import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildEscalaProficiencia,
  type BuildEscalaProficienciaOptions,
  type EscalaProficienciaData,
} from '../factories/escala-proficiencia.factory';
import { select2 } from '../helpers/select2.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  abrirEdicaoEscalaProficiencia,
  linhaEscalaProficiencia,
  navegarParaAdicionarEscalaProficiencia,
  navegarParaConsultaEscalaProficiencia,
  pesquisarEscalaProficiencia,
} from '../helpers/navigation/escala-proficiencia.navigation';

export interface EscalaProficienciaCriada extends EscalaProficienciaData {
  url: string;
}

async function confirmarSucesso(page: Page, texto: RegExp): Promise<void> {
  const alerta = page.locator('.swal2-popup:visible');
  await expect(alerta).toContainText(texto, { timeout: 20000 });
  const confirmar = alerta.getByRole('button', { name: /^(Ok|OK)$/i });
  await expect(confirmar).toBeVisible();
  await confirmar.click();
  await expect(alerta).toBeHidden({ timeout: 15000 });
}

async function definirAtivo(page: Page, ativo: boolean): Promise<void> {
  const formulario = page.locator('#main');
  const controle = formulario.locator('#Ativo');
  await controle.waitFor({ state: 'attached', timeout: 10000 });
  if (await controle.isChecked() !== ativo) {
    const alternador = formulario.locator('label:has(#Ativo) .toggle');
    await expect(alternador).toBeVisible();
    await alternador.click();
  }
  await expect(controle).toBeChecked({ checked: ativo });
}

async function preencherCampo(input: Locator, valor: string): Promise<void> {
  await expect(input).toBeVisible();
  await input.fill(valor);
  await input.press('Tab');
  await expect(input).toHaveValue(valor);
}

async function preencherNumero(input: Locator, valor: string): Promise<void> {
  await expect(input).toBeVisible();
  await input.fill(valor);
  await input.press('Tab');
  const atual = (await input.inputValue()).replace(',', '.');
  if (!Number.isFinite(Number(atual)) || Number(atual) !== Number(valor.replace(',', '.'))) {
    throw new Error(`O campo numérico reteve "${atual}"; esperado "${valor}".`);
  }
}

async function adicionarParametrosEscala(page: Page, dados: EscalaProficienciaData): Promise<void> {
  if (!dados.parametros.length) return;

  const formulario = page.locator('#main');
  const aba = getByRoleSge(formulario, 'link', {
    name: 'Parâmetros da Escala de Proficiência',
    exact: true,
  });
  await expect(aba).toBeVisible();
  await aba.click();
  const adicionar = formulario.locator('#btnAdicionarParametro');
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  const grade = page.locator('#gridParametrosEscala:visible');
  await expect(grade).toBeVisible({ timeout: 15000 });
  for (const parametro of dados.parametros) {
    await grade.locator('thead a').last().click();
    const linha = grade.locator('tbody tr:visible').last();
    const pontuacao = linha.locator('td').nth(0).locator('input');
    const idade = linha.locator('td').nth(1).locator('input');
    await preencherNumero(pontuacao.nth(0), parametro.pontuacaoInicial);
    await preencherNumero(pontuacao.nth(1), parametro.pontuacaoFinal);
    if (parametro.idadeAte) await preencherNumero(idade.nth(0), parametro.idadeAte);
    await preencherCampo(idade.nth(1), parametro.dataAntes);
    if (parametro.idadeApartir) await preencherNumero(idade.nth(2), parametro.idadeApartir);
    await preencherCampo(idade.nth(3), parametro.dataApartir);

    const equivalencia = linha.locator('td').nth(2).locator('[id^="s2id_"]').first();
    const idEquivalencia = await equivalencia.getAttribute('id');
    if (!idEquivalencia) throw new Error('O Select2 de equivalência não expõe o identificador do campo.');
    await select2.select(page, `#${idEquivalencia}`, parametro.equivalenciaSaida, { exactMatch: true });

    const concluiCorrecao = linha.locator('input[type="checkbox"]').first();
    await concluiCorrecao.setChecked(parametro.concluiCorrecaoFluxo);
    await expect(concluiCorrecao).toBeChecked({ checked: parametro.concluiCorrecaoFluxo });
  }

  const salvar = page.locator('#btnSalvarParametrosEscala');
  await expect(salvar).toBeVisible();
  await salvar.click();
  await confirmarSucesso(page, /Os parâmetros da escala foram salvos\./i);
  await expect(page.locator('#gridParametrosEscala')).toBeHidden();

  const linhas = formulario.locator('table tbody tr:visible').filter({ hasText: /antes de.*\|.*à partir de/i });
  await expect(linhas).toHaveCount(dados.parametros.length, { timeout: 15000 });
  for (const parametro of dados.parametros) {
    const equivalenciaExibida = parametro.equivalenciaSaida.replace(/\s+\[\d+\]$/, '');
    await expect(linhas.filter({ hasText: equivalenciaExibida })).toHaveCount(1);
    const idadeAte = parametro.idadeAte ? `${parametro.idadeAte} ` : '';
    const idadeApartir = parametro.idadeApartir ? `${parametro.idadeApartir} ` : '';
    await expect(linhas.filter({ hasText: `${idadeAte}antes de ${parametro.dataAntes}` })).toHaveCount(1);
    await expect(linhas.filter({ hasText: `${idadeApartir}à partir de ${parametro.dataApartir}` })).toHaveCount(1);
  }
}

async function validarComposicaoLivre(page: Page, composicao: string, ativo: boolean): Promise<void> {
  if (!ativo) return;
  await pesquisarEscalaProficiencia(page, composicao);
  const linhas = page.locator('#main table tbody tr:visible');
  for (const linha of await linhas.all()) {
    const celulas = linha.locator('td');
    if (await celulas.count() < 4) continue;
    const composicaoNaLinha = (await celulas.nth(2).innerText()).trim();
    const ativaNaLinha = (await celulas.nth(3).innerText()).trim();
    if (composicaoNaLinha === composicao && /^Sim$/i.test(ativaNaLinha)) {
      throw new Error(`A composição "${composicao}" já possui uma Escala de Proficiência ativa.`);
    }
  }
}

async function proximoCodigoLivre(page: Page, inicial: string): Promise<string> {
  if (!/^\d{1,19}$/.test(inicial)) throw new Error('O código inicial deve conter de 1 a 19 dígitos.');
  const base = BigInt(inicial);
  for (let indice = 0n; indice < 100n; indice++) {
    const codigo = String(base + indice);
    if (codigo.length > 19) break;
    await pesquisarEscalaProficiencia(page, codigo);
    if (await linhaEscalaProficiencia(page, codigo).count() === 0) return codigo;
  }
  throw new Error(`Não encontrei um código livre a partir de ${inicial} nas próximas 100 opções.`);
}

/** Cria uma escala QAAUTO, configura os parâmetros e confirma a persistência na consulta. */
export async function criarEscalaProficiencia(
  page: Page,
  options: BuildEscalaProficienciaOptions,
  aoCriar?: (dados: EscalaProficienciaCriada) => void,
): Promise<EscalaProficienciaCriada> {
  const composicao = options.composicaoEnsino?.trim() || '';
  if (!composicao) throw new Error('Informe a composição de ensino.');
  await navegarParaConsultaEscalaProficiencia(page);
  await validarComposicaoLivre(page, composicao, options.ativo ?? true);
  const codigo = await proximoCodigoLivre(page, options.codigoInicial?.trim() || '900000000');
  const dados = buildEscalaProficiencia(options, codigo);
  await navegarParaAdicionarEscalaProficiencia(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Codigo').fill(dados.codigo);
  await formulario.locator('#Descricao').fill(dados.descricao);
  await formulario.locator('#ComposicaoEnsinoId option[value]:not([value=""])')
    .first().waitFor({ state: 'attached', timeout: 20000 });
  await select2.select(page, '#ComposicaoEnsinoId', dados.composicaoEnsino, {
    exactMatch: true,
    timeout: 20000,
  });
  await definirAtivo(page, dados.ativo);

  await formulario.locator('#btn-salvar').click();
  const sucessoCriacao = page.locator('.swal2-popup:visible');
  await expect(sucessoCriacao).toContainText(/Escala de Proficiência salva com sucesso\!/i, { timeout: 20000 });
  const criada: EscalaProficienciaCriada = { ...dados, url: page.url() };
  aoCriar?.(criada);
  await sucessoCriacao.getByRole('button', { name: /^(Ok|OK)$/i }).click();
  await expect(sucessoCriacao).toBeHidden({ timeout: 15000 });
  await expect(getByRoleSge(formulario, 'heading', { name: /Editar Escala de Proficiência/i }))
    .toBeVisible({ timeout: 20000 });
  await expect(formulario.locator('#Codigo')).toHaveValue(dados.codigo);
  await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao);
  await expect(formulario.locator('#Ativo')).toBeChecked({ checked: dados.ativo });

  await adicionarParametrosEscala(page, dados);

  await pesquisarEscalaProficiencia(page, dados.codigo);
  const linha = linhaEscalaProficiencia(page, dados.codigo);
  await expect(linha).toHaveCount(1);
  await expect(linha).toContainText(dados.descricao);
  await expect(linha).toContainText(dados.composicaoEnsino);
  await abrirEdicaoEscalaProficiencia(page, dados.codigo);
  await expect(formulario.locator('#Codigo')).toHaveValue(dados.codigo);
  await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao);
  await expect(formulario.locator('#Ativo')).toBeChecked({ checked: dados.ativo });

  console.log(`[QAAUTO] Escala de Proficiência criada e conferida: ${dados.codigo} | ${dados.descricao}`);
  return criada;
}
