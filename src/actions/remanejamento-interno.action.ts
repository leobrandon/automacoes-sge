import { expect, type Locator, type Page } from '@playwright/test';
import { navegarParaConsultaAlunos } from '../helpers/navigation/aluno.navigation';
import { waitForSgeLoaders } from '../helpers/navigation/common.navigation';
import {
  navegarParaMatricularAlunosRemanejados,
  navegarParaRemanejamentoInterno,
} from '../helpers/navigation/remanejamento-interno.navigation';

export interface RemanejamentoInternoDados {
  /** Rótulo completo do ano escolar de origem (ex.: "1º ANO - COMPOSIÇÃO DE ENSINO ANOS INICIAIS (Parcial)"). */
  serie: string;
  /** Escola de destino oferecida pelo SGE para a série de origem. */
  escolaDestino: string;
  /** Aluno QAAUTO elegível na série de origem, sem solicitação Solicitada pendente. */
  aluno: string;
  /** Motivo digitado ao rejeitar a solicitação no destino (limpeza da massa). */
  motivoRejeicao: string;
  /** Escola de origem esperada na solicitação exibida no destino (a escola do usuário de origem). */
  escolaOrigem: string;
  /** Ano escolar de origem esperado na solicitação (ex.: "1º ANO"). */
  anoEscolarOrigem: string;
  /** Ano escolar de destino esperado na solicitação (ex.: "2º ANO"). */
  anoEscolarDestino: string;
}

export interface SolicitacaoRemanejadaEsperada {
  aluno: string;
  motivo: string;
  escolaOrigem: string;
  anoEscolarOrigem: string;
  anoEscolarDestino: string;
}

export const MENSAGENS_REMANEJAMENTO_INTERNO = {
  semDestino: 'Existem alunos aprovados que não tiveram suas unidades escolares de destino informadas',
  sucessoRemanejamento: 'Remanejamento interno efetuado',
  confirmarAprovacao: 'Tem certeza que deseja aprovar as solicitações de transferência selecionadas',
  sucessoAprovacao: 'foram matriculados na unidade escolar e tiveram suas solicitações aprovadas',
  confirmarRejeicao: 'Tem certeza que deseja rejeitar as solicitações de transferência selecionadas',
  pedirMotivo: 'Qual o motivo?',
  sucessoRejeicao: 'tiveram suas solicitações rejeitadas pelo motivo informado',
} as const;

function exato(texto: string): RegExp {
  return new RegExp(`^\\s*${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
}

function contem(texto: string): RegExp {
  return new RegExp(texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function popup(page: Page): Locator {
  return page.locator('.swal2-popup:visible');
}

/** Escolhe uma opção no dropdown global do Select2 já aberto, exigindo exatamente uma com o rótulo informado. */
async function escolherOpcaoSelect2(page: Page, rotulo: string, descricao: string): Promise<void> {
  const lista = page.locator('#select2-drop:visible');
  await expect(lista).toBeVisible();
  const opcoes = lista.locator('li.select2-result-selectable');
  await expect(opcoes.first(), `${descricao}: nenhuma opção disponível.`).toBeVisible();
  const opcao = opcoes.filter({ hasText: exato(rotulo) });
  if (await opcao.count() !== 1) {
    const disponiveis = (await opcoes.allInnerTexts()).map(t => t.trim()).join(' | ');
    throw new Error(`${descricao} "${rotulo}" indisponível ou ambígua. Disponíveis: ${disponiveis}.`);
  }
  await opcao.click();
}

export async function abrirRemanejamentoInterno(page: Page): Promise<void> {
  await navegarParaRemanejamentoInterno(page);
}

export function gradeRemanejamento(page: Page): Locator {
  return page.locator('#tabela_alunos');
}

/** Linha de um aluno na grade; o nome aparece em maiúsculas, por isso a busca ignora caixa. */
export function linhaAlunoRemanejamento(page: Page, nome: string): Locator {
  return gradeRemanejamento(page).locator('tbody tr').filter({ hasText: contem(nome) });
}

/**
 * Exige o aluno na grade de candidatos. Quem tem solicitação "Solicitada" não é listado (RMI-002), então a causa
 * mais provável da ausência é uma execução anterior interrompida entre remanejar e rejeitar.
 */
export async function exigirAlunoElegivel(page: Page, nome: string): Promise<Locator> {
  const linha = linhaAlunoRemanejamento(page, nome);
  await expect(
    linha,
    `Aluno "${nome}" não está na grade de remanejamento. Se uma execução anterior parou depois de remanejar, ` +
      'a solicitação ficou "Solicitada": rejeite-a em Matricular alunos remanejados, logado na escola de destino.',
  ).toHaveCount(1);
  return linha;
}

/** Escolhe o ano escolar de origem e espera a grade de candidatos carregar. */
export async function selecionarSerieOrigem(page: Page, serie: string): Promise<void> {
  await page.locator('#s2id_SerieDeOrigemId .select2-choice').click();
  await escolherOpcaoSelect2(page, serie, 'Ano escolar de origem');
  await expect(page.locator('#s2id_SerieDeOrigemId .select2-chosen')).toHaveText(exato(serie));
  await expect(gradeRemanejamento(page)).toBeVisible();
}

/** Escolhe a escola no campo multi-seleção "Escola de Destino" e espera o chip aparecer. */
export async function selecionarEscolaDestino(page: Page, escola: string): Promise<void> {
  await page.locator('#s2id_EscolasDeDestino .select2-choices').click();
  await escolherOpcaoSelect2(page, escola, 'Escola de destino');
  await expect(page.locator('#s2id_EscolasDeDestino .select2-search-choice').filter({ hasText: exato(escola) })).toBeVisible();
}

/** Define o destino de um aluno na coluna Destino. O seletor da linha só abre com o clique no próprio controle. */
export async function definirDestinoDoAluno(page: Page, nome: string, escola: string): Promise<void> {
  const linha = await exigirAlunoElegivel(page, nome);
  await linha.locator('.select2-choice').click();
  await escolherOpcaoSelect2(page, escola, `Destino do aluno ${nome}`);
  await expect(linha.locator('.select2-chosen')).toHaveText(exato(escola));
}

export async function acionarProcessarRemanejamento(page: Page): Promise<void> {
  await page.locator('#btn_processar').click();
}

/** Aviso exibido quando algum aluno da grade ficou sem escola de destino. */
export async function esperarAvisoAlunosSemDestino(page: Page): Promise<void> {
  await expect(popup(page).filter({ hasText: MENSAGENS_REMANEJAMENTO_INTERNO.semDestino })).toBeVisible();
}

/**
 * Responde ao aviso. Com "Não" o popup fecha; com "Sim" o mesmo popup vira "Aguarde..." e depois o aviso de sucesso,
 * por isso só "Não" espera o fechamento.
 */
export async function responderAviso(page: Page, resposta: 'Sim' | 'Não'): Promise<void> {
  await popup(page).getByRole('button', { name: resposta, exact: true }).click();
  if (resposta === 'Não') await expect(popup(page)).toBeHidden();
}

/** Espera o sucesso do remanejamento e fecha o aviso. Em caso de recusa, o texto do SGE entra na falha. */
export async function confirmarSucessoRemanejamento(page: Page): Promise<void> {
  const sucesso = popup(page).filter({ hasText: MENSAGENS_REMANEJAMENTO_INTERNO.sucessoRemanejamento });
  try {
    await expect(sucesso).toBeVisible({ timeout: 30000 });
  } catch (erro) {
    const aviso = (await popup(page).allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ');
    throw new Error(`O SGE não confirmou o remanejamento. Aviso exibido: ${aviso || 'nenhum'}. ${String(erro)}`);
  }
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(popup(page)).toBeHidden();
}

/**
 * Na escola de destino: abre Matricular alunos remanejados, localiza a solicitação do aluno e prova que ela veio da
 * origem e da série certas, ainda `Solicitada`, antes de qualquer decisão. Devolve a linha e a deixa marcada.
 */
async function marcarSolicitacaoRemanejada(page: Page, esperada: SolicitacaoRemanejadaEsperada): Promise<Locator> {
  await navegarParaMatricularAlunosRemanejados(page);
  const linha = page.locator('#content table tbody tr').filter({ hasText: contem(esperada.aluno) });
  await expect(linha, `Solicitação de "${esperada.aluno}" não encontrada em Matricular alunos remanejados (situação Solicitada).`).toHaveCount(1);
  await expect(linha).toContainText('Solicitada');
  await expect(linha).toContainText(contem(esperada.escolaOrigem));
  await expect(linha).toContainText(contem(esperada.anoEscolarOrigem));
  await expect(linha).toContainText(contem(esperada.anoEscolarDestino));
  await linha.locator('input.checkbox_solicitacao').check();
  return linha;
}

/**
 * Na escola de destino: aprova a solicitação. O SGE matricula o aluno na unidade de destino, sem alocá-lo em turma,
 * e a operação é irreversível. A linha sai da grade das solicitações pendentes.
 */
export async function aprovarSolicitacaoRemanejada(page: Page, esperada: Omit<SolicitacaoRemanejadaEsperada, 'motivo'>): Promise<void> {
  const linha = await marcarSolicitacaoRemanejada(page, { ...esperada, motivo: '' });
  await page.getByRole('button', { name: 'Aprovar' }).click();

  const confirmar = popup(page).filter({ hasText: MENSAGENS_REMANEJAMENTO_INTERNO.confirmarAprovacao });
  await expect(confirmar).toBeVisible();
  await confirmar.getByRole('button', { name: 'Sim', exact: true }).click();

  const sucesso = popup(page).filter({ hasText: MENSAGENS_REMANEJAMENTO_INTERNO.sucessoAprovacao });
  await expect(sucesso).toBeVisible({ timeout: 30000 });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(popup(page)).toBeHidden();
  await expect(linha).toHaveCount(0);
}

/**
 * Pesquisa o aluno por nome em Aluno > Cadastro e devolve o texto das linhas encontradas.
 * A aprovação gera nova matrícula no destino, então a busca é pelo nome (o nome aleatório da factory é único).
 */
export async function consultarAlunoNaUnidade(page: Page, nome: string): Promise<string[]> {
  await navegarParaConsultaAlunos(page);
  const situacao = page.locator('#Matricula');
  if (await situacao.isVisible({ timeout: 2000 }).catch(() => false)) await situacao.selectOption('0');
  const campo = page.locator('#CampoFiltroTermoDePesquisa');
  if (await campo.isVisible({ timeout: 2000 }).catch(() => false)) await campo.selectOption('0');
  await page.locator('#searchTerm').fill(nome);
  await page.locator('#btnSubmitSearch, button:has(i.fa-search)').first().click();
  const grade = page.locator('#grid');
  await expect(grade).toBeVisible();
  await waitForSgeLoaders(page);
  const linhas = grade.locator('table tbody tr').filter({ has: page.locator('.colunaAlunoNome') }).filter({ hasText: contem(nome) });
  // A grade às vezes devolve a lista sem filtro; só o texto do aluno procurado interessa.
  return (await linhas.allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim());
}

/** Na escola de destino: localiza a solicitação pelo nome e a rejeita informando o motivo. */
export async function rejeitarSolicitacaoRemanejada(page: Page, esperada: SolicitacaoRemanejadaEsperada): Promise<void> {
  const { motivo } = esperada;
  const linha = await marcarSolicitacaoRemanejada(page, esperada);
  await page.getByRole('button', { name: 'Rejeitar' }).click();

  const confirmar = popup(page).filter({ hasText: MENSAGENS_REMANEJAMENTO_INTERNO.confirmarRejeicao });
  await expect(confirmar).toBeVisible();
  await confirmar.getByRole('button', { name: 'Sim', exact: true }).click();

  const pedido = popup(page).filter({ hasText: MENSAGENS_REMANEJAMENTO_INTERNO.pedirMotivo });
  await expect(pedido).toBeVisible();
  await pedido.locator('.swal2-textarea').fill(motivo);
  await pedido.getByRole('button', { name: 'Continuar', exact: true }).click();

  const sucesso = popup(page).filter({ hasText: MENSAGENS_REMANEJAMENTO_INTERNO.sucessoRejeicao });
  await expect(sucesso).toBeVisible({ timeout: 30000 });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(popup(page)).toBeHidden();
  await expect(linha).toHaveCount(0);
}
