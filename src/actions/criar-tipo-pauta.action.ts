import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildTipoPauta,
  DESTINOS_TIPO_PAUTA,
  nomeAgrupadorTipoPauta,
  tituloItemTipoPauta,
  type BuildTipoPautaOptions,
  type TipoPautaData,
} from '../factories/tipo-pauta.factory';
import {
  abrirEdicaoTipoPauta,
  confirmarAvisoTipoPauta,
  linhaTipoPauta,
  navegarParaAdicionarTipoPauta,
  pesquisarTipoPauta,
  proximaSequenciaLivreTipoPauta,
  tituloConsultaTipoPauta,
  voltarParaConsultaTipoPauta,
} from '../helpers/navigation/tipo-pauta.navigation';
import { select2 } from '../helpers/select2.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { waitForSgeLoaders } from '../helpers/navigation/common.navigation';

export interface TipoPautaCriado extends TipoPautaData {
  url: string;
}

async function opcoesDoSelect(formulario: Locator, id: string): Promise<string[]> {
  return (await formulario.locator(`#${id} option`).allTextContents())
    .map((texto) => texto.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/** Falha rápida e acionável quando o dado de apoio não existe no tenant (a automação não o cria). */
function escolherOpcao(opcoes: string[], desejado: string, rotulo: string, semOpcoes: string): string {
  if (opcoes.length === 0) throw new Error(semOpcoes);
  if (!desejado) return opcoes[0];
  if (!opcoes.includes(desejado)) {
    throw new Error(`${rotulo} "${desejado}" não existe no tenant. Opções encontradas: ${opcoes.join(' | ')}.`);
  }
  return desejado;
}

/**
 * A pontuação usa máscara de centavos: `fill` não aciona a máscara e o SGE grava 0. Digitar os dígitos
 * (valor × 100) produz "100,00" e é o que um usuário faz.
 */
async function preencherPontuacao(campo: Locator, valor: number): Promise<void> {
  await campo.click();
  await campo.press('Control+A');
  await campo.pressSequentially(String(valor * 100));
  await expect(campo).toHaveValue(`${valor},00`);
}

async function abrirAba(formulario: Locator, nome: RegExp): Promise<void> {
  // As abas são âncoras sem papel de link no accessibility tree; o texto da aba é o identificador.
  const aba = formulario.locator('.nav-tabs a').filter({ hasText: nome });
  await expect(aba).toBeVisible();
  await aba.click();
}

/** Toggle Sim/Não (bootstrap-toggle): o clique vai no `.toggle` que envolve o checkbox. */
async function definirToggle(formulario: Locator, id: string, ligado: boolean): Promise<void> {
  const entrada = formulario.locator(`#${id}`);
  if (await entrada.isChecked() !== ligado) await formulario.locator(`.toggle:has(#${id})`).click();
  await expect(entrada).toBeChecked({ checked: ligado });
}

async function confirmarAviso(page: Page, texto: RegExp): Promise<void> {
  const sucesso = page.getByRole('dialog').filter({ hasText: texto });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible() && !await sucesso.first().isVisible()) {
    throw new Error(`O SGE recusou a estrutura da pauta: ${(await atencao.first().innerText()).replace(/\s+/g, ' ').trim()}`);
  }
  await confirmarAvisoTipoPauta(page, 'Ok');
}

/**
 * Aba "Estrutura do formulário": só é liberada depois do primeiro salvamento e cada agrupador/item é gravado
 * na hora pelo próprio modal (independe do botão Salvar da pauta). Os itens são Sim/Não, com a pontuação
 * máxima dividida pelo SGE entre os itens (modo "divisão igualitária").
 */
async function criarEstrutura(page: Page, formulario: Locator, dados: TipoPautaData): Promise<void> {
  if (dados.quantidadeAgrupadores === 0) return;
  await abrirAba(formulario, /Estrutura do formulário/);
  const estrutura = formulario.locator('#abaTipoPautaEstrutura');
  let numeroItem = 0;

  for (let g = 1; g <= dados.quantidadeAgrupadores; g++) {
    const nomeGrupo = nomeAgrupadorTipoPauta(g);
    // Sem agrupadores o botão tem texto; depois vira um ícone com title. O onclick é o mesmo nos dois.
    await estrutura.locator('button[onclick*="AbraModalDeGrupoDeItemDaPauta(0)"]:visible').click();
    const modalGrupo = formulario.locator('#modalGrupoDeItemDaPauta');
    await expect(modalGrupo.locator('#Nome')).toBeVisible({ timeout: 15000 });
    await modalGrupo.locator('#Nome').fill(nomeGrupo);
    await getByRoleSge(modalGrupo.locator('.modal-footer'), 'button', { name: 'Salvar' }).click();
    await confirmarAviso(page, /O agrupador foi adicionado/i);
    await expect(modalGrupo).toBeHidden({ timeout: 15000 });

    // O painel do agrupador recém-criado precisa estar ativo para o "Adicionar item" vincular a ele.
    await estrutura.locator('.pauta-grupos-abas a').filter({ hasText: nomeGrupo }).click();
    const painel = estrutura.locator('.pauta-grupos-conteudo > .tab-pane.active');
    await expect(painel.locator('h4')).toContainText(nomeGrupo);

    for (let i = 1; i <= dados.itensPorAgrupador; i++) {
      const titulo = tituloItemTipoPauta(++numeroItem);
      await getByRoleSge(painel, 'button', { name: /Adicionar item/ }).click();
      const modalItem = formulario.locator('#modalItemDaPauta');
      await expect(modalItem.locator('#ItemDescricao')).toBeVisible({ timeout: 15000 });
      await modalItem.locator('#ItemDescricao').fill(titulo);
      await getByRoleSge(modalItem.locator('.modal-footer'), 'button', { name: 'Salvar' }).click();
      await confirmarAviso(page, /Campo adicionado com sucesso/i);
      await expect(modalItem).toBeHidden({ timeout: 15000 });
      await expect(getByRoleSge(painel, 'cell', { name: titulo, exact: true })).toBeVisible({ timeout: 15000 });
    }
    await expect(painel.locator('small')).toContainText(`${dados.itensPorAgrupador} campo(s) vinculado(s)`);
  }
}

/**
 * Cria pelo formulário e prova a persistência na grade e reabrindo o registro. Os agrupadores e itens
 * (opcionais) só são liberados pelo SGE depois do primeiro salvamento e são criados em seguida.
 */
export async function criarTipoPauta(
  page: Page,
  options: BuildTipoPautaOptions = {},
  sequencia = 1,
): Promise<TipoPautaCriado> {
  // O SGE recusa nome repetido na mesma área; usa a primeira sequência livre para a conferência ser inequívoca.
  const sequenciaLivre = await proximaSequenciaLivreTipoPauta(page, options, sequencia);
  const dados = buildTipoPauta(options, sequenciaLivre);
  await navegarParaAdicionarTipoPauta(page);

  const formulario = page.locator('#main');
  await waitForSgeLoaders(page);
  const area = escolherOpcao(
    await opcoesDoSelect(formulario, 'AreaDeAtuacaoDePautaId'), dados.areaAtuacao, 'A área de atuação',
    'Nenhuma Área de atuação cadastrada. Execute criar_area_atuacao_action antes de criar o Tipo de pauta.',
  );
  const calendario = escolherOpcao(
    await opcoesDoSelect(formulario, 'CalendarioEscolarId'), dados.calendario, 'O calendário-base',
    'Nenhum Calendário Escolar cadastrado. Cadastre um calendário (Escola > Calendário Escolar) antes de criar o Tipo de pauta.',
  );

  // Aba "Identificação e comportamento"
  await formulario.locator('#Nome').fill(dados.nome);
  await formulario.locator('#Eixo').selectOption({ label: dados.eixo });
  await select2.select(page, '#AreaDeAtuacaoDePautaId', area, { exactMatch: true });
  if (dados.descricao) await formulario.locator('#Descricao').fill(dados.descricao);
  await preencherPontuacao(formulario.locator('#PontuacaoTotal'), dados.pontuacaoMaxima);
  await definirToggle(formulario, 'RegistraDataDaPauta', dados.registraDataDaPauta);
  // "Permite cadastro retroativo" só aparece com a data da pauta ligada.
  if (dados.registraDataDaPauta) await definirToggle(formulario, 'PermiteCadastroRetroativo', dados.permiteCadastroRetroativo);

  // Aba "Aplicação e filtros": ao menos um destino permitido
  await abrirAba(formulario, /Aplicação e filtros/);
  const valorDestino = DESTINOS_TIPO_PAUTA[dados.destino as keyof typeof DESTINOS_TIPO_PAUTA];
  const destino = formulario.locator(`input[name="TiposDeUnidadeAplicaveis"][value="${valorDestino}"]`);
  // O checkbox é estilizado: o clique vai no rótulo que o contém.
  await formulario.locator(`label:has(input[name="TiposDeUnidadeAplicaveis"][value="${valorDestino}"])`).click();
  await expect(destino).toBeChecked();

  // Aba "Periodicidade e preenchimento"
  await abrirAba(formulario, /Periodicidade e preenchimento/);
  await select2.select(page, '#CalendarioEscolarId', calendario, { exactMatch: true });
  await formulario.locator('#PeriodicidadeDePlanejamento').selectOption({ label: dados.periodicidade });

  const salvar = formulario.locator('#btnSalvarTipoDePauta');
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByRole('dialog').filter({ hasText: /Tipo de pauta salvo com sucesso/i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible()) {
    const validacoes = (await formulario.locator('.span-error-validator').allTextContents())
      .map((texto) => texto.trim()).filter(Boolean);
    throw new Error(
      `O SGE não aceitou o Tipo de pauta "${dados.nome}" (aviso "Atenção"). `
      + `Validações: ${validacoes.join(' | ') || 'nenhuma'}.`,
    );
  }

  // O aviso de sucesso não fecha sozinho: bloqueia a tela até o Ok. Depois o SGE fica em "Alterar Tipo de Pauta".
  await confirmarAvisoTipoPauta(page, 'Ok');
  await expect(getByRoleSge(formulario, 'heading', { name: /Alterar Tipo de Pauta/i })).toBeVisible({ timeout: 20000 });
  await criarEstrutura(page, formulario, dados);
  await voltarParaConsultaTipoPauta(page);
  await expect(tituloConsultaTipoPauta(page)).toBeVisible();

  await pesquisarTipoPauta(page, dados.nome);
  const linha = linhaTipoPauta(page, dados.nome);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(getByRoleSge(linha, 'cell', { name: area, exact: true })).toBeVisible();
  // A coluna "Itens" soma os campos de todos os agrupadores.
  const totalItens = dados.quantidadeAgrupadores * dados.itensPorAgrupador;
  await expect(getByRoleSge(linha, 'cell', { name: String(totalItens), exact: true })).toBeVisible();

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoTipoPauta(page, dados.nome);
  await expect(formulario.locator('#Eixo option:checked')).toHaveText(dados.eixo);
  await expect(formulario.locator('#AreaDeAtuacaoDePautaId option:checked')).toHaveText(area);
  await expect(formulario.locator('#PontuacaoTotal')).toHaveValue(`${dados.pontuacaoMaxima},00`);
  if (dados.descricao) await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao);
  await expect(destino).toBeChecked();
  await expect(formulario.locator('#CalendarioEscolarId option:checked')).toHaveText(calendario);
  await expect(formulario.locator('#PeriodicidadeDePlanejamento option:checked')).toHaveText(dados.periodicidade);
  await expect(formulario.locator('#RegistraDataDaPauta')).toBeChecked({ checked: dados.registraDataDaPauta });
  await expect(formulario.locator('#PermiteCadastroRetroativo')).toBeChecked({ checked: dados.permiteCadastroRetroativo });
  if (dados.quantidadeAgrupadores > 0) {
    await abrirAba(formulario, /Estrutura do formulário/);
    const grupos = formulario.locator('#abaTipoPautaEstrutura .pauta-grupos-abas a');
    await expect(grupos).toHaveCount(dados.quantidadeAgrupadores);
    for (let g = 1; g <= dados.quantidadeAgrupadores; g++) {
      await expect(grupos.filter({ hasText: nomeAgrupadorTipoPauta(g) })).toHaveCount(1);
    }
  }
  await voltarParaConsultaTipoPauta(page);

  console.log(`[QAAUTO] Tipo de pauta criado e conferido: ${dados.nome}`);
  return { ...dados, areaAtuacao: area, calendario, url: page.url() };
}
