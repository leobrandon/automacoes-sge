import { expect, type Page } from '@playwright/test';
import {
  buildTurmaDiversificada,
  type BuildTurmaDiversificadaOptions,
  type TurmaDiversificadaData,
} from '../factories/turma-diversificada.factory';
import { escaparRegexTurma, proximaSequenciaLivreTurma } from '../helpers/navigation/turma.navigation';
import {
  celulaDescricaoTurmaDiversificada,
  linhaTurmaDiversificada,
  navegarParaAdicionarTurmaDiversificada,
  pesquisarTurmaDiversificada,
} from '../helpers/navigation/turma-diversificada.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { esperarOpcoesCarregadas, selecionarOpcaoApoio } from '../helpers/turma-apoio.helper';

const TIPO = 'Turma Diversificada';

export interface TurmaDiversificadaCriada extends TurmaDiversificadaData {
  horarioEntradaPersistido: string;
  horarioSaidaPersistido: string;
  url: string;
}

export type TurmaDiversificadaIdentificador = Pick<
  TurmaDiversificadaData,
  'descricao' | 'unidadeEducacional' | 'calendarioEscolar'
>;

export interface CriarTurmaDiversificadaHooks {
  /** Chamado apenas depois que a UI confirma que a gravação foi concluída. */
  onPersistida?: (turma: TurmaDiversificadaIdentificador) => void;
}

function regexExato(texto: string): RegExp {
  return new RegExp(`^\\s*${escaparRegexTurma(texto.trim())}\\s*$`, 'i');
}

/** Nome da escola sem o código INEP que o Select2 acrescenta ("NOME - 52315"). */
function nomeDaEscola(unidadeEducacional: string): string {
  return unidadeEducacional.split(' - ')[0].trim();
}

async function selecionarApoio(page: Page, id: string, desejada: string, cadastro: string): Promise<void> {
  await selecionarOpcaoApoio(page, id, desejada, cadastro, TIPO);
}

/** Preenche os campos em cascata (cada lista só carrega depois do campo anterior). */
async function preencherFormulario(page: Page, dados: TurmaDiversificadaData): Promise<void> {
  const formulario = page.locator('#main');

  await selecionarApoio(page, 'Escola_UnidadeSubordinadora_Id', dados.diretoriaRegional, 'Secretaria/Diretoria Regional');
  await esperarOpcoesCarregadas(page, 'Escola_Cidade2_Id', 'Cidade/Município');
  await selecionarApoio(page, 'Escola_Cidade2_Id', dados.municipio, 'Cidade/Município');
  await esperarOpcoesCarregadas(page, 'EscolaId', 'Escola');
  await selecionarApoio(page, 'EscolaId', dados.unidadeEducacional, 'Escola');

  const idCalendario = 'SerieComposicao_ComposicaoCalendario_CalendarioEscolar';
  await esperarOpcoesCarregadas(page, `${idCalendario}_AnoLetivoId`, 'Ano Letivo');
  await selecionarApoio(page, `${idCalendario}_AnoLetivoId`, dados.anoLetivo, 'Ano Letivo');
  await esperarOpcoesCarregadas(page, `${idCalendario}Id`, 'Calendário Escolar');
  await selecionarApoio(page, `${idCalendario}Id`, dados.calendarioEscolar, 'Calendário Escolar');
  await esperarOpcoesCarregadas(page, 'SerieComposicao_ComposicaoCalendarioId', 'Composição de Ensino');
  await selecionarApoio(page, 'SerieComposicao_ComposicaoCalendarioId', dados.composicaoEnsino, 'Composição de Ensino');
  await esperarOpcoesCarregadas(page, 'SerieComposicaoId', 'Ano Escolar');
  await selecionarApoio(page, 'SerieComposicaoId', dados.anoEscolar, 'Ano Escolar');
  await esperarOpcoesCarregadas(page, 'Turno', 'Turno');
  await selecionarApoio(page, 'Turno', dados.turno, 'Turno');

  await formulario.locator('#Descricao').fill(dados.descricao);
  await formulario.locator('#TipoMediacaoDidaticoPedagogica').selectOption({ label: dados.mediacaoDidaticoPedagogica });
  if (await formulario.locator('#s2id_LocalDeFuncionamentoDiferenciadoDaTurma').isVisible()) {
    await selecionarApoio(
      page,
      'LocalDeFuncionamentoDiferenciadoDaTurma',
      dados.localFuncionamentoDiferenciado,
      'Local de funcionamento diferenciado',
    );
  }
}

/** Reaberta pelo próprio SGE depois de salvar: confere o que foi gravado e devolve os horários do turno. */
async function conferirPersistenciaNoFormulario(
  page: Page,
  dados: TurmaDiversificadaData,
): Promise<{ entrada: string; saida: string }> {
  const conteudo = page.locator('#main');
  const formulario = conteudo.locator('#form_turma');
  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar Turma Diversificada/i })).toBeVisible();
  await expect(formulario.locator('#Descricao')).toHaveValue(regexExato(dados.descricao));
  await expect(formulario.locator('#Escola_NomeFantasiaComInep'))
    .toHaveValue(new RegExp(escaparRegexTurma(nomeDaEscola(dados.unidadeEducacional)), 'i'));
  await expect(formulario.locator('#SerieComposicao_ComposicaoCalendario_CalendarioEscolar_Descricao')).toHaveValue(dados.calendarioEscolar);
  // Ativa: Select2 somente leitura; Rascunho: campo de texto `DescTurno`.
  await expect.poll(async () => {
    const texto = formulario.locator('#DescTurno');
    if (await texto.count() > 0) return texto.inputValue();
    return (await formulario.locator('#s2id_Turno .select2-chosen').textContent()) ?? '';
  }, { message: `O turno persistido deveria ser "${dados.turno}".` }).toContain(dados.turno);

  const entrada = (await formulario.locator('#HorarioEntrada').inputValue()).trim();
  const saida = (await formulario.locator('#HorarioSaida').inputValue()).trim();
  if (!entrada || !saida) throw new Error('O SGE não exibiu os horários persistidos da Turma Diversificada.');

  const statusEsperado = dados.situacaoDesejada === 'Ativo' ? 'Ativa' : 'Rascunho';
  await expect(formulario.locator('#situacaoAux')).toHaveValue(statusEsperado);
  return { entrada, saida };
}

async function conferirLinhaDaConsulta(page: Page, dados: TurmaDiversificadaData): Promise<void> {
  await pesquisarTurmaDiversificada(page, dados.descricao);
  const linha = linhaTurmaDiversificada(page, dados.descricao);
  await expect(linha).toHaveCount(1);
  await expect(celulaDescricaoTurmaDiversificada(linha, dados.descricao)).toHaveText(regexExato(dados.descricao));
  await expect(getByRoleSge(linha, 'cell', { name: 'Diversificada', exact: true })).toBeVisible();
  await expect(getByRoleSge(linha, 'cell', { name: dados.anoEscolar, exact: true })).toBeVisible();
  await expect(getByRoleSge(linha, 'cell', { name: dados.calendarioEscolar, exact: true })).toBeVisible();
  await expect(getByRoleSge(linha, 'cell', { name: dados.composicaoEnsino, exact: true })).toBeVisible();
  await expect(getByRoleSge(linha, 'cell', { name: dados.turno, exact: true })).toBeVisible();
  await expect(getByRoleSge(linha, 'cell', { name: nomeDaEscola(dados.unidadeEducacional), exact: true })).toBeVisible();

  const statusEsperado = dados.situacaoDesejada === 'Ativo' ? 'Ativa' : 'Rascunho';
  await expect(getByRoleSge(linha, 'cell', { name: statusEsperado, exact: true })).toBeVisible();
}

/** Cria uma Turma Diversificada pela UI, escolhe o modo de salvamento e confirma a persistência. */
export async function criarTurmaDiversificada(
  page: Page,
  options: BuildTurmaDiversificadaOptions = {},
  sequencia = 1,
  hooks: CriarTurmaDiversificadaHooks = {},
): Promise<TurmaDiversificadaCriada> {
  // A turma criada por uma execução anterior continua no ambiente: usa a primeira sequência com descrição livre.
  const sequenciaLivre = await proximaSequenciaLivreTurma(
    page, (n) => buildTurmaDiversificada(options, n).descricao, sequencia,
  );
  const dados = buildTurmaDiversificada(options, sequenciaLivre);

  await navegarParaAdicionarTurmaDiversificada(page);
  await preencherFormulario(page, dados);

  const salvar = page.locator('#main #btnSubmitTurma');
  await expect(salvar).toBeVisible();
  await salvar.click();

  const dialogoModo = page.getByRole('dialog').filter({ hasText: /Como você deseja salvar essa turma\?/i });
  await expect(dialogoModo).toBeVisible({ timeout: 15000 });
  const botaoModo = dados.situacaoDesejada === 'Ativo' ? 'Salvar Ativo' : 'Salvar Rascunho';
  await dialogoModo.getByRole('button', { name: botaoModo, exact: true }).click();

  const sucesso = page.getByRole('dialog').filter({ hasText: /Turma salva\./i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible() && !await sucesso.first().isVisible()) {
    const aviso = (await atencao.first().innerText()).replace(/\s+/g, ' ').trim();
    throw new Error(`O SGE não salvou a ${TIPO} "${dados.descricao}": ${aviso}`);
  }
  hooks.onPersistida?.({
    descricao: dados.descricao,
    unidadeEducacional: dados.unidadeEducacional,
    calendarioEscolar: dados.calendarioEscolar,
  });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });

  const horarios = await conferirPersistenciaNoFormulario(page, dados);
  await conferirLinhaDaConsulta(page, dados);

  console.log(`[QAAUTO] ${TIPO} criada e conferida: ${dados.descricao}`);
  return {
    ...dados,
    horarioEntradaPersistido: horarios.entrada,
    horarioSaidaPersistido: horarios.saida,
    url: page.url(),
  };
}
