import { expect, type Locator, type Page } from '@playwright/test';
import { buildFichaAvaliativa, type BuildFichaAvaliativaOptions, type FichaAvaliativaData } from '../factories/ficha-avaliativa.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  abrirEdicaoFichaAvaliativa,
  aguardarCarregamentoFichaAvaliativa,
  linhaFichaAvaliativa,
  navegarParaAdicionarFichaAvaliativa,
  pesquisarFichaAvaliativa,
} from '../helpers/navigation/ficha-avaliativa.navigation';

export interface FichaAvaliativaCriada extends FichaAvaliativaData { url: string; sequencia: number }

function main(page: Page): Locator { return page.locator('#main'); }

async function confirmarSalvamento(page: Page, contexto: string, mensagemEsperada?: RegExp): Promise<void> {
  const alerta = page.locator('.swal2-popup:visible').first();
  await alerta.waitFor({ state: 'visible', timeout: 20000 });
  const texto = (await alerta.innerText()).replace(/\s+/g, ' ').trim();
  if (mensagemEsperada && !mensagemEsperada.test(texto)) {
    throw new Error(`Mensagem inesperada ao salvar ${contexto}: ${texto}`);
  }
  if (/erro|falha|inválid|obrigatóri|duplicad|não foi possível/i.test(texto) || !/salv|sucesso|incluíd|adicionad/i.test(texto)) {
    throw new Error(`O SGE não confirmou o salvamento de ${contexto}: ${texto}`);
  }
  const ok = alerta.locator('button:visible').filter({ hasText: /^(Ok|Fechar)$/i }).first();
  if (await ok.count()) await ok.click();
  await alerta.waitFor({ state: 'hidden', timeout: 10000 });
}

async function salvarBotao(page: Page, seletor: string, contexto: string): Promise<void> {
  await main(page).locator(seletor).waitFor({ state: 'visible', timeout: 15000 });
  await main(page).locator(seletor).click();
  await aguardarCarregamentoFichaAvaliativa(page);
  await confirmarSalvamento(page, contexto);
}

async function preencherEditor(page: Page, texto: string): Promise<void> {
  const editor = main(page).locator('#P1 iframe.cke_wysiwyg_frame').first();
  await editor.waitFor({ state: 'visible', timeout: 15000 });
  const body = page.frameLocator('#P1 iframe.cke_wysiwyg_frame').locator('body');
  await body.fill(texto);
  await expect(body).toContainText(texto);
}

async function abrirAba(page: Page, seletor: string): Promise<void> {
  await main(page).locator(seletor).click();
  await aguardarCarregamentoFichaAvaliativa(page);
}

async function selecionarOpcaoSelect2(page: Page, campo: string, valor: string): Promise<void> {
  const gatilho = main(page).locator(`#s2id_${campo} > .select2-choice`);
  await gatilho.waitFor({ state: 'visible', timeout: 10000 });
  await gatilho.click();
  const busca = page.locator('.select2-drop-active .select2-input:visible').first();
  if (await busca.count()) await busca.fill(valor);
  const opcao = page.getByRole('option', { name: valor, exact: true });
  await opcao.waitFor({ state: 'visible', timeout: 10000 });
  await opcao.click();
  await expect(main(page).locator(`#${campo} option:checked`)).toHaveText(valor);
}

async function abrirFormularioAgrupador(page: Page): Promise<void> {
  await abrirAba(page, '#periodo1');
  const secao = main(page).locator('#P1');
  const adicionar = getByRoleSge(secao, 'button', { name: /Adicionar\s*$/ }).filter({ visible: true });
  await adicionar.waitFor({ state: 'visible', timeout: 15000 });
  await expect(adicionar).toHaveCount(1);
  await adicionar.click();
  await main(page).getByRole('heading', { name: /(?:Adicionar|Editar) Agrupar Ficha/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 20000 });
}

async function salvarAgrupador(page: Page, descricao: string): Promise<void> {
  await main(page).locator('#Descricao').fill(descricao);
  const ordem = main(page).locator('#Ordem');
  if (await ordem.count()) await ordem.fill('1');
  const adicionarTopico = main(page).locator('#btnAdicionarAgrupadorFichaAvaliativa');
  await expect(adicionarTopico).toBeHidden();
  await main(page).locator('#btnSalvarAgrupadorFicha').click();
  await aguardarCarregamentoFichaAvaliativa(page);
  await expect(adicionarTopico).toBeVisible({ timeout: 20000 });
  const tituloAgrupador = main(page).getByRole('heading', { name: /Editar Agrupar Ficha/i, includeHidden: true });
  if (await tituloAgrupador.isVisible().catch(() => false)) {
    await expect(main(page).locator('#gridTopico')).toBeVisible();
    return;
  }
  const tituloFicha = main(page).getByRole('heading', { name: /Editar Ficha Avaliativa/i, includeHidden: true });
  if (!await tituloFicha.isVisible().catch(() => false)) {
    throw new Error('Após salvar o agrupador, o SGE não retornou à edição da ficha nem ao agrupador salvo.');
  }
  const descricaoEscapada = descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const celula = main(page).locator('#gridAgrupador tbody td:first-child')
    .getByText(new RegExp(`^\\s*${descricaoEscapada}\\s*$`));
  const linha = celula.locator('..').locator('..');
  await expect(linha).toHaveCount(1);
}

async function abrirAgrupadorSalvo(page: Page, descricao: string): Promise<void> {
  const tituloFicha = main(page).getByRole('heading', { name: /Editar Ficha Avaliativa/i, includeHidden: true });
  if (await tituloFicha.isVisible().catch(() => false)) await abrirAba(page, '#periodo1');
  const descricaoEscapada = descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const celula = main(page).locator('#gridAgrupador tbody td:first-child')
    .getByText(new RegExp(`^\\s*${descricaoEscapada}\\s*$`));
  const linha = celula.locator('..').locator('..');
  await linha.waitFor({ state: 'visible', timeout: 15000 });
  if (await linha.count() !== 1) throw new Error(`Esperado um agrupador salvo "${descricao}"; encontrados ${await linha.count()}.`);
  await linha.locator('td:visible').first().click();
  await main(page).getByRole('heading', { name: /Editar Agrupar Ficha/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 15000 });
  await expect(main(page).locator('#Descricao')).toHaveValue(descricao);
}

async function criarTopico(page: Page, descricao: string): Promise<void> {
  const adicionar = main(page).locator('#btnAdicionarAgrupadorFichaAvaliativa');
  await adicionar.waitFor({ state: 'visible', timeout: 15000 });
  await adicionar.click();
  await main(page).getByRole('heading', { name: /Adicionar Tópico Ficha/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 15000 });
  await main(page).locator('#Descricao').fill(descricao);
  const ordem = main(page).locator('#Ordem');
  if (await ordem.count()) await ordem.fill('1');
  await salvarBotao(page, '#btnSalvarTopicoFicha', 'o tópico');
  const tituloTopico = main(page).getByRole('heading', { name: /Adicionar Tópico Ficha/i, includeHidden: true });
  const tituloAgrupador = main(page).getByRole('heading', { name: /Editar Agrupar Ficha/i, includeHidden: true });
  const tituloFicha = main(page).getByRole('heading', { name: /Editar Ficha Avaliativa/i, includeHidden: true });
  if (await tituloTopico.isVisible().catch(() => false)) {
    const voltar = getByRoleSge(main(page), 'button', { name: /Voltar\s*$/ }).filter({ visible: true });
    await voltar.click();
    await tituloAgrupador.waitFor({ state: 'visible', timeout: 15000 });
  }
  if (!await tituloAgrupador.isVisible().catch(() => false)) {
    if (await tituloFicha.isVisible().catch(() => false)) return;
    throw new Error('Após salvar o tópico, o SGE não retornou ao agrupador nem à ficha avaliativa.');
  }
  const descricaoEscapada = descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const celulaTopico = main(page).locator('#gridTopico tbody td:first-child')
    .getByText(new RegExp(`^\\s*${descricaoEscapada}\\s*$`));
  const linha = celulaTopico.locator('..').locator('..');
  await expect(linha).toHaveCount(1);
}

async function voltarParaFicha(page: Page): Promise<void> {
  const tituloFicha = main(page).getByRole('heading', { name: /Editar Ficha Avaliativa/i, includeHidden: true });
  if (await tituloFicha.isVisible().catch(() => false)) return;
  const voltar = getByRoleSge(main(page), 'button', { name: /Voltar\s*$/ }).filter({ visible: true });
  await voltar.click();
  await main(page).getByRole('heading', { name: /Editar Ficha Avaliativa/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 15000 });
}

async function criarDesempenhoFinal(page: Page, descricao: string): Promise<void> {
  await abrirAba(page, '#parecerFinal');
  const adicionar = main(page).locator('#btnAdicionarParecerFinal');
  await adicionar.waitFor({ state: 'visible', timeout: 15000 });
  await adicionar.click();
  const dialog = main(page).locator('#modalDesempenhoFinalAprendizagem');
  await dialog.waitFor({ state: 'visible', timeout: 10000 });
  await dialog.locator('#Descricao').fill(descricao);
  await dialog.locator('#btnSalvarDesempenhoFinalAprendizagem').click();
  await aguardarCarregamentoFichaAvaliativa(page);
  await confirmarSalvamento(page, 'o desempenho final', /Desempenho Final de Aprendizagem adicionado\./i);
  await dialog.waitFor({ state: 'hidden', timeout: 15000 });
  const descricaoEscapada = descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const linha = main(page).locator('#gridParecerFinal tbody tr:visible').filter({
    has: page.locator('td:visible').getByText(new RegExp(`^\\s*${descricaoEscapada}\\s*$`)),
  });
  await expect(linha).toHaveCount(1, { timeout: 15000 });
}

/** Cria a ficha e todos os registros filhos exclusivamente pelos controles visíveis do SGE. */
export async function criarFichaAvaliativa(
  page: Page,
  options: BuildFichaAvaliativaOptions = {},
  sequencia = 1,
): Promise<FichaAvaliativaCriada> {
  let sequenciaDisponivel = sequencia;
  let dados = buildFichaAvaliativa(options, sequenciaDisponivel);
  // Execuções anteriores preservam as fichas; escolha um nome ainda livre pela UI.
  await pesquisarFichaAvaliativa(page, dados.descricao);
  while (await linhaFichaAvaliativa(page, dados.descricao).count() > 0) {
    sequenciaDisponivel++;
    dados = buildFichaAvaliativa(options, sequenciaDisponivel);
    await pesquisarFichaAvaliativa(page, dados.descricao);
  }
  console.log(`\n🚀 Ficha Avaliativa a ser criada: "${dados.descricao}"`);

  await navegarParaAdicionarFichaAvaliativa(page);
  const form = main(page);
  await form.locator('#Descricao').fill(dados.descricao);
  const titulo = form.locator('#TituloParaImpressao');
  if (await titulo.count() && dados.tituloParaImpressao) await titulo.fill(dados.tituloParaImpressao);
  await selecionarOpcaoSelect2(page, 'Periodicidade', dados.periodicidade);
  await selecionarOpcaoSelect2(page, 'TipoAssinaturaFichaAvaliativa', dados.assinatura);
  await selecionarOpcaoSelect2(page, 'FormaAvaliacaoFichaAvaliativa', dados.formaAvaliacao);
  await abrirAba(page, '#periodo1');
  await preencherEditor(page, dados.informacaoComplementar);
  await salvarBotao(page, '#btnSalvar', 'a ficha avaliativa');

  await pesquisarFichaAvaliativa(page, dados.descricao);
  const linha = linhaFichaAvaliativa(page, dados.descricao);
  await expect(linha).toHaveCount(1);
  await abrirEdicaoFichaAvaliativa(page, dados.descricao);

  await abrirFormularioAgrupador(page);
  await salvarAgrupador(page, dados.agrupador);
  const tituloAgrupador = main(page).getByRole('heading', { name: /Editar Agrupar Ficha/i, includeHidden: true });
  if (!await tituloAgrupador.isVisible().catch(() => false)) await abrirAgrupadorSalvo(page, dados.agrupador);
  await criarTopico(page, dados.topico);
  await voltarParaFicha(page);
  await criarDesempenhoFinal(page, dados.desempenhoFinal);
  await salvarBotao(page, '#btnSalvar', 'a ficha avaliativa com seus registros relacionados');

  await pesquisarFichaAvaliativa(page, dados.descricao);
  await expect(linhaFichaAvaliativa(page, dados.descricao)).toHaveCount(1);
  return { ...dados, url: page.url(), sequencia: sequenciaDisponivel };
}
