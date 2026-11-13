import { expect, type Locator, type Page } from '@playwright/test';
import { buildTurmaAee, type BuildTurmaAeeOptions, type TurmaAeeData } from '../factories/turma-aee.factory';
import { proximaSequenciaLivreTurma } from '../helpers/navigation/turma.navigation';
import { esperarOpcoesCarregadas, selecionarOpcaoApoio } from '../helpers/turma-apoio.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  linhaTurmaAee,
  navegarParaAdicionarTurmaAee,
  pesquisarTurmaAee,
  celulaDescricaoTurmaAee,
} from '../helpers/navigation/turma-aee.navigation';

export interface TurmaAeeCriada extends TurmaAeeData {
  horarioEntradaPersistido: string;
  horarioSaidaPersistido: string;
  url: string;
}

export type TurmaAeeIdentificador = Pick<TurmaAeeData, 'descricao' | 'unidadeEducacional' | 'calendarioEscolar'>;

export interface CriarTurmaAeeHooks {
  /** Chamado apenas depois que a UI confirma que a gravação foi concluída. */
  onPersistida?: (turma: TurmaAeeIdentificador) => void;
}

function normalizar(texto: string): string {
  return texto.trim().toLocaleLowerCase('pt-BR');
}

function regexExato(texto: string): RegExp {
  return new RegExp(`^\\s*${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
}

async function selecionarMultiplos(
  page: Page,
  formulario: Locator,
  nomeAcessivel: RegExp,
  opcoesDesejadas: readonly string[],
  cadastro: string,
): Promise<void> {
  const campo = getByRoleSge(formulario, 'textbox', { name: nomeAcessivel });
  await expect(campo).toBeVisible();

  for (const desejada of opcoesDesejadas) {
    const dropdownExistente = page.locator('#select2-drop:visible').first();
    if (!await dropdownExistente.isVisible().catch(() => false)) await campo.click();

    const dropdown = page.locator('#select2-drop:visible').first();
    await expect(dropdown).toBeVisible();
    const resultados = dropdown.locator('ul.select2-results li.select2-result-selectable');
    const disponiveis = (await resultados.allInnerTexts()).map((texto) => texto.trim()).filter(Boolean);
    if (!disponiveis.some((texto) => normalizar(texto) === normalizar(desejada))) {
      await page.keyboard.press('Escape');
      if (disponiveis.length === 0) {
        throw new Error(`Nenhum registro de ${cadastro} está disponível no seletor.`);
      }
      throw new Error(`${cadastro} "${desejada}" não encontrado. Opções disponíveis: ${disponiveis.join(' | ')}.`);
    }

    const opcao = resultados.filter({ hasText: regexExato(desejada) });
    await expect(opcao).toHaveCount(1);
    await opcao.click();
    await page.keyboard.press('Escape');
    await expect(formulario.getByText(desejada, { exact: true }).filter({ visible: true })).toHaveCount(1);
  }
}

async function conferirPersistenciaNoFormulario(page: Page, dados: TurmaAeeData): Promise<{ entrada: string; saida: string }> {
  const formulario = page.locator('#formEditarTurmaAEE');
  await expect(getByRoleSge(page.locator('#main'), 'heading', { name: /Editar Turma de AEE/i })).toBeVisible();
  await expect(formulario.locator('#Descricao')).toHaveValue(regexExato(dados.descricao));
  await expect(formulario.locator('#CalendarioEscolar_Descricao')).toHaveValue(dados.calendarioEscolar);
  await expect(formulario.locator('#s2id_Turno .select2-chosen')).toContainText(dados.turno);

  const entrada = (await formulario.locator('#HorarioEntrada').inputValue()).trim();
  const saida = (await formulario.locator('#HorarioSaida').inputValue()).trim();
  if (!entrada || !saida) throw new Error('O SGE não exibiu os horários persistidos da Turma AEE.');
  if (dados.horarioEntrada && entrada !== dados.horarioEntrada) {
    throw new Error(`Horário de entrada persistido "${entrada}" difere do configurado "${dados.horarioEntrada}".`);
  }
  if (dados.horarioSaida && saida !== dados.horarioSaida) {
    throw new Error(`Horário de saída persistido "${saida}" difere do configurado "${dados.horarioSaida}".`);
  }

  const statusEsperado = dados.situacaoDesejada === 'Ativo' ? 'Ativa' : 'Rascunho';
  await expect(formulario.locator('#tabDadosGerais #Status[type="text"]')).toHaveValue(statusEsperado);
  for (const dia of dados.diasDeAtendimento) {
    await expect(formulario.getByText(dia, { exact: true }).filter({ visible: true })).toHaveCount(1);
  }
  for (const atividade of dados.atividadesAee) {
    await expect(formulario.getByText(atividade, { exact: true }).filter({ visible: true })).toHaveCount(1);
  }
  return { entrada, saida };
}

async function conferirLinhaDaConsulta(page: Page, dados: TurmaAeeData): Promise<void> {
  await pesquisarTurmaAee(page, dados.descricao);
  const linha = linhaTurmaAee(page, dados.descricao);
  await expect(linha).toHaveCount(1);
  await expect(celulaDescricaoTurmaAee(linha, dados.descricao)).toHaveText(regexExato(dados.descricao));
  await expect(getByRoleSge(linha, 'cell', { name: 'AEE', exact: true })).toBeVisible();
  await expect(getByRoleSge(linha, 'cell', { name: dados.calendarioEscolar, exact: true })).toBeVisible();

  const parteDaEscola = dados.unidadeEducacional.split(' - ')[0].trim();
  await expect(getByRoleSge(linha, 'cell').filter({
    visible: true,
    hasText: new RegExp(parteDaEscola.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
  })).toHaveCount(1);

  const statusEsperado = dados.situacaoDesejada === 'Ativo' ? 'Ativa' : 'Rascunho';
  await expect(getByRoleSge(linha, 'cell', { name: statusEsperado, exact: true })).toBeVisible();
}

/** Cria uma Turma AEE pela UI, seleciona o modo de salvamento e confirma a persistência. */
export async function criarTurmaAee(
  page: Page,
  options: BuildTurmaAeeOptions = {},
  sequencia = 1,
  hooks: CriarTurmaAeeHooks = {},
): Promise<TurmaAeeCriada> {
  // A turma criada por uma execução anterior continua no ambiente: usa a primeira sequência com descrição livre.
  const sequenciaLivre = await proximaSequenciaLivreTurma(page, (n) => buildTurmaAee(options, n).descricao, sequencia);
  const dados = buildTurmaAee(options, sequenciaLivre);

  await navegarParaAdicionarTurmaAee(page);
  const formulario = page.locator('#formCreateTurmaAEE');

  await selecionarOpcaoApoio(page, 'Escola_UnidadeSubordinadoraId', dados.diretoriaRegional, 'Secretaria/Diretoria Regional', 'Turma AEE');
  await esperarOpcoesCarregadas(page, 'Escola_Cidade2Id', 'Cidade/Município');
  await selecionarOpcaoApoio(page, 'Escola_Cidade2Id', dados.municipio, 'Cidade/Município', 'Turma AEE');
  await esperarOpcoesCarregadas(page, 'EscolaId', 'Unidade Escolar');
  await selecionarOpcaoApoio(page, 'EscolaId', dados.unidadeEducacional, 'Unidade Escolar', 'Turma AEE');
  await esperarOpcoesCarregadas(page, 'CalendarioEscolarId', 'Calendário Escolar');
  await selecionarOpcaoApoio(page, 'CalendarioEscolarId', dados.calendarioEscolar, 'Calendário Escolar', 'Turma AEE');
  await esperarOpcoesCarregadas(page, 'Turno', 'Turno');
  await selecionarOpcaoApoio(page, 'Turno', dados.turno, 'Turno', 'Turma AEE');

  await formulario.locator('#Descricao').fill(dados.descricao);
  if (dados.horarioEntrada) await formulario.locator('#HorarioEntrada').fill(dados.horarioEntrada);
  if (dados.horarioSaida) await formulario.locator('#HorarioSaida').fill(dados.horarioSaida);

  await selecionarMultiplos(page, formulario, /Dias de atendimento/i, dados.diasDeAtendimento, 'dias de atendimento');
  await selecionarMultiplos(
    page,
    formulario,
    /Atividades de Atendimento Educacional Especializado - AEE/i,
    dados.atividadesAee,
    'Atividades de AEE',
  );

  const salvar = getByRoleSge(page.locator('#main'), 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();
  await salvar.click();

  const dialogoModo = page.getByRole('dialog').filter({ hasText: /Como você deseja salvar essa turma\?/i });
  await expect(dialogoModo).toBeVisible({ timeout: 15000 });
  const botaoModo = dados.situacaoDesejada === 'Ativo' ? 'Salvar Ativo' : 'Salvar Rascunho';
  await dialogoModo.getByRole('button', { name: botaoModo, exact: true }).click();

  const sucesso = page.getByRole('dialog').filter({ hasText: /Turma de AEE cadastrada com sucesso!/i });
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  hooks.onPersistida?.({
    descricao: dados.descricao,
    unidadeEducacional: dados.unidadeEducacional,
    calendarioEscolar: dados.calendarioEscolar,
  });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });

  const horarios = await conferirPersistenciaNoFormulario(page, dados);
  await conferirLinhaDaConsulta(page, dados);

  return {
    ...dados,
    horarioEntradaPersistido: horarios.entrada,
    horarioSaidaPersistido: horarios.saida,
    url: page.url(),
  };
}
