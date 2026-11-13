import { expect, type Page } from '@playwright/test';
import {
  buildTurmaTipo,
  isTurmaQAAuto,
  type BuildTurmaTipoOptions,
  type TurmaTipoData,
  type TurmaTipoFactoryConfig,
} from '../factories/turma-tipo.factory';
import {
  celulaDescricaoTurma,
  escaparRegexTurma,
  linhaTurma,
  pesquisarTurma,
  proximaSequenciaLivreTurma,
} from '../helpers/navigation/turma.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { esperarOpcoesCarregadas, selecionarOpcaoApoio } from '../helpers/turma-apoio.helper';

/**
 * Criar/excluir das turmas cadastradas pela mesma tela (Diversificada, Alternativa). Cada tipo informa só o que muda:
 * nome nas mensagens, texto da coluna "Tipo de Turma" da grade, a factory e a navegação até o formulário.
 */
export interface TurmaTipoActionConfig {
  factory: TurmaTipoFactoryConfig;
  /** Texto da coluna "Tipo de Turma" na consulta, ex.: "Alternativa". */
  tipoNaGrade: string;
  navegarParaAdicionar: (page: Page) => Promise<void>;
}

export interface TurmaTipoCriada extends TurmaTipoData {
  horarioEntradaPersistido: string;
  horarioSaidaPersistido: string;
  cargaHorariaPersistida: string;
  url: string;
}

export type TurmaTipoIdentificador = Pick<TurmaTipoData, 'descricao' | 'unidadeEducacional' | 'calendarioEscolar'>;

export interface CriarTurmaTipoHooks {
  /** Chamado apenas depois que a UI confirma que a gravação foi concluída. */
  onPersistida?: (turma: TurmaTipoIdentificador) => void;
}

export interface TurmaTipoExcluida {
  descricao: string;
  url: string;
}

function regexExato(texto: string): RegExp {
  return new RegExp(`^\\s*${escaparRegexTurma(texto.trim())}\\s*$`, 'i');
}

/** Nome da escola sem o código INEP que o Select2 acrescenta ("NOME - 52315"). */
function nomeDaEscola(unidadeEducacional: string): string {
  return unidadeEducacional.split(' - ')[0].trim();
}

function statusDaGrade(dados: Pick<TurmaTipoData, 'situacaoDesejada'>): string {
  return dados.situacaoDesejada === 'Ativo' ? 'Ativa' : 'Rascunho';
}

async function falharComAviso(dialogo: ReturnType<Page['getByRole']>, mensagem: string): Promise<never> {
  const aviso = (await dialogo.first().innerText()).replace(/\s+/g, ' ').trim();
  throw new Error(`${mensagem}: ${aviso}`);
}

/** Preenche os campos em cascata (cada lista só carrega depois do campo anterior) e devolve a Carga Horária. */
async function preencherFormulario(page: Page, nome: string, dados: TurmaTipoData): Promise<string> {
  const formulario = page.locator('#main');
  const apoio = (id: string, desejada: string, cadastro: string) =>
    selecionarOpcaoApoio(page, id, desejada, cadastro, nome);

  await apoio('Escola_UnidadeSubordinadora_Id', dados.diretoriaRegional, 'Secretaria/Diretoria Regional');
  await esperarOpcoesCarregadas(page, 'Escola_Cidade2_Id', 'Cidade/Município');
  await apoio('Escola_Cidade2_Id', dados.municipio, 'Cidade/Município');
  await esperarOpcoesCarregadas(page, 'EscolaId', 'Escola');
  await apoio('EscolaId', dados.unidadeEducacional, 'Escola');

  const idCalendario = 'SerieComposicao_ComposicaoCalendario_CalendarioEscolar';
  await esperarOpcoesCarregadas(page, `${idCalendario}_AnoLetivoId`, 'Ano Letivo');
  await apoio(`${idCalendario}_AnoLetivoId`, dados.anoLetivo, 'Ano Letivo');
  await esperarOpcoesCarregadas(page, `${idCalendario}Id`, 'Calendário Escolar');
  await apoio(`${idCalendario}Id`, dados.calendarioEscolar, 'Calendário Escolar');
  await esperarOpcoesCarregadas(page, 'SerieComposicao_ComposicaoCalendarioId', 'Composição de Ensino');
  await apoio('SerieComposicao_ComposicaoCalendarioId', dados.composicaoEnsino, 'Composição de Ensino');
  await esperarOpcoesCarregadas(page, 'SerieComposicaoId', 'Ano Escolar');
  await apoio('SerieComposicaoId', dados.anoEscolar, 'Ano Escolar');
  await esperarOpcoesCarregadas(page, 'Turno', 'Turno');
  await apoio('Turno', dados.turno, 'Turno');

  // Carga Horária é obrigatória e vem da composição/ano escolar: sem ela o SGE só responde "Verifique os dados".
  const carga = formulario.locator('#CargaHoraria');
  await expect(
    carga,
    `O SGE não preencheu a Carga Horária (obrigatória) para "${dados.composicaoEnsino}" / "${dados.anoEscolar}"; `
    + `a ${nome} não pode ser salva sem ela. Escolha uma composição e um ano escolar com carga horária definida.`,
  ).toHaveValue(/\S/);
  const cargaHoraria = (await carga.inputValue()).trim();

  await formulario.locator('#Descricao').fill(dados.descricao);
  await formulario.locator('#TipoMediacaoDidaticoPedagogica').selectOption({ label: dados.mediacaoDidaticoPedagogica });
  // O campo aparece com qualquer mediação (verificado na UI): se sumir, a falha deve ser visível.
  await expect(formulario.locator('#s2id_LocalDeFuncionamentoDiferenciadoDaTurma')).toBeVisible();
  await apoio('LocalDeFuncionamentoDiferenciadoDaTurma', dados.localFuncionamentoDiferenciado, 'Local de funcionamento diferenciado');
  return cargaHoraria;
}

/** Reaberta pelo próprio SGE depois de salvar: confere o que foi gravado e devolve horários e carga do turno. */
async function conferirPersistenciaNoFormulario(
  page: Page,
  nome: string,
  dados: TurmaTipoData,
  cargaPreenchida: string,
): Promise<{ entrada: string; saida: string; carga: string }> {
  const conteudo = page.locator('#main');
  const formulario = conteudo.locator('#form_turma');
  await expect(getByRoleSge(conteudo, 'heading', { name: new RegExp(`Editar ${escaparRegexTurma(nome)}`, 'i') })).toBeVisible();
  await expect(formulario.locator('#Descricao')).toHaveValue(regexExato(dados.descricao));
  await expect(formulario.locator('#Escola_NomeFantasiaComInep'))
    .toHaveValue(new RegExp(escaparRegexTurma(nomeDaEscola(dados.unidadeEducacional)), 'i'));
  await expect(formulario.locator('#SerieComposicao_ComposicaoCalendario_CalendarioEscolar_Descricao')).toHaveValue(dados.calendarioEscolar);
  await expect(formulario.locator('#CargaHoraria')).toHaveValue(cargaPreenchida);
  // Ativa: Select2 somente leitura; Rascunho: campo de texto `DescTurno`.
  await expect.poll(async () => {
    const texto = formulario.locator('#DescTurno');
    if (await texto.count() > 0) return texto.inputValue();
    return (await formulario.locator('#s2id_Turno .select2-chosen').textContent()) ?? '';
  }, { message: `O turno persistido deveria ser "${dados.turno}".` }).toContain(dados.turno);

  const entrada = (await formulario.locator('#HorarioEntrada').inputValue()).trim();
  const saida = (await formulario.locator('#HorarioSaida').inputValue()).trim();
  if (!entrada || !saida) throw new Error(`O SGE não exibiu os horários persistidos da ${nome}.`);

  await expect(formulario.locator('#situacaoAux')).toHaveValue(statusDaGrade(dados));
  return { entrada, saida, carga: cargaPreenchida };
}

async function conferirLinhaDaConsulta(page: Page, config: TurmaTipoActionConfig, dados: TurmaTipoData): Promise<void> {
  await pesquisarTurma(page, dados.descricao);
  const linha = linhaTurma(page, dados.descricao);
  await expect(linha).toHaveCount(1);
  await expect(celulaDescricaoTurma(linha, dados.descricao)).toHaveText(regexExato(dados.descricao));
  for (const texto of [
    config.tipoNaGrade,
    dados.anoEscolar,
    dados.calendarioEscolar,
    dados.composicaoEnsino,
    dados.turno,
    nomeDaEscola(dados.unidadeEducacional),
    statusDaGrade(dados),
  ]) {
    await expect(getByRoleSge(linha, 'cell', { name: texto, exact: true })).toBeVisible();
  }
}

/** Cria uma turma do tipo pela UI, escolhe o modo de salvamento e confirma a persistência. */
export async function criarTurmaTipo(
  page: Page,
  config: TurmaTipoActionConfig,
  options: BuildTurmaTipoOptions = {},
  sequencia = 1,
  hooks: CriarTurmaTipoHooks = {},
): Promise<TurmaTipoCriada> {
  const { nome } = config.factory;
  // A turma criada por uma execução anterior continua no ambiente: usa a primeira sequência com descrição livre.
  const sequenciaLivre = await proximaSequenciaLivreTurma(
    page, (n) => buildTurmaTipo(config.factory, options, n).descricao, sequencia,
  );
  const dados = buildTurmaTipo(config.factory, options, sequenciaLivre);

  await config.navegarParaAdicionar(page);
  const cargaPreenchida = await preencherFormulario(page, nome, dados);

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
    await falharComAviso(atencao, `O SGE não salvou a ${nome} "${dados.descricao}"`);
  }
  hooks.onPersistida?.({
    descricao: dados.descricao,
    unidadeEducacional: dados.unidadeEducacional,
    calendarioEscolar: dados.calendarioEscolar,
  });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });

  const persistido = await conferirPersistenciaNoFormulario(page, nome, dados, cargaPreenchida);
  await conferirLinhaDaConsulta(page, config, dados);

  console.log(`[QAAUTO] ${nome} criada e conferida: ${dados.descricao}`);
  return {
    ...dados,
    horarioEntradaPersistido: persistido.entrada,
    horarioSaidaPersistido: persistido.saida,
    cargaHorariaPersistida: persistido.carga,
    url: page.url(),
  };
}

async function excluirRascunhoPelaGrade(page: Page, nome: string, descricao: string): Promise<void> {
  const linha = linhaTurma(page, descricao);
  // Ícone sem texto: o title identifica a ação.
  const remover = linha.locator('[title="Excluir rascunho da turma"]');
  await expect(remover).toBeVisible();
  await remover.click();

  const confirmacao = page.getByRole('dialog').filter({ hasText: /Tem certeza que deseja remover o rascunho dessa turma\?/i });
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

  const sucesso = page.getByRole('dialog').filter({ hasText: /A turma rascunho foi removida\./i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i }).filter({ hasNotText: /Tem certeza/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible() && !await sucesso.first().isVisible()) {
    await falharComAviso(atencao, `O SGE não removeu o rascunho "${descricao}"`);
  }
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });

  await pesquisarTurma(page, descricao);
  await expect(linhaTurma(page, descricao)).toHaveCount(0);
  console.log(`[QAAUTO] Rascunho de ${nome} removido e ausência conferida: ${descricao}`);
}

/** Exclui somente a turma QAAUTO retornada pela ação de criação desta execução. */
export async function excluirTurmaTipo(
  page: Page,
  config: TurmaTipoActionConfig,
  criada: TurmaTipoIdentificador,
): Promise<TurmaTipoExcluida> {
  const { nome } = config.factory;
  const descricao = criada.descricao.trim();
  if (!isTurmaQAAuto(descricao)) {
    throw new Error('A exclusão automatizada requer uma descrição iniciada por QAAUTO.');
  }

  await pesquisarTurma(page, descricao);
  const linha = linhaTurma(page, descricao);
  await expect(linha).toHaveCount(1);
  await expect(celulaDescricaoTurma(linha, descricao)).toHaveCount(1);
  await expect(getByRoleSge(linha, 'cell', { name: config.tipoNaGrade, exact: true })).toBeVisible();
  await expect(getByRoleSge(linha, 'cell', { name: criada.calendarioEscolar, exact: true })).toBeVisible();

  // Rascunho não tem botão Excluir na edição: a remoção é o ícone da própria linha da grade.
  if (await getByRoleSge(linha, 'cell', { name: 'Rascunho', exact: true }).count() > 0) {
    await excluirRascunhoPelaGrade(page, nome, descricao);
    return { descricao, url: page.url() };
  }
  await linha.click();

  const conteudo = page.locator('#main');
  const formulario = conteudo.locator('#form_turma');
  await expect(getByRoleSge(conteudo, 'heading', { name: new RegExp(`Editar ${escaparRegexTurma(nome)}`, 'i') })).toBeVisible();
  await expect(formulario.locator('#Descricao')).toHaveValue(regexExato(descricao));
  await expect(formulario.locator('#SerieComposicao_ComposicaoCalendario_CalendarioEscolar_Descricao')).toHaveValue(criada.calendarioEscolar);

  // A turma desta execução não tem alunos; se tiver, a exclusão não deve prosseguir.
  await formulario.locator('.nav-tabs a').filter({ hasText: 'Alunos na Turma' }).click();
  const abaAlunos = formulario.locator('#tabAlunosNaTurma');
  await expect(abaAlunos.locator('table')).toBeVisible();
  await expect(abaAlunos.locator('table tbody tr')).toHaveCount(0);

  const excluir = conteudo.locator('#btn_excluir');
  await expect(excluir).toBeVisible();
  await excluir.click();

  const confirmacao = page.getByRole('dialog').filter({ hasText: /Tem certeza que deseja excluir essa turma\?/i });
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await expect(confirmacao).toContainText(/irreversível/i);
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

  // O SweetAlert reaproveita o mesmo diálogo: a pergunta some antes do resultado aparecer.
  const sucesso = page.getByRole('dialog').filter({ hasText: /Turma excluída/i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i }).filter({ hasNotText: /Tem certeza/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible() && !await sucesso.first().isVisible()) {
    await falharComAviso(atencao, `O SGE não excluiu a ${nome} "${descricao}"`);
  }
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });

  await pesquisarTurma(page, descricao);
  await expect(linhaTurma(page, descricao)).toHaveCount(0);

  console.log(`[QAAUTO] ${nome} excluída e ausência conferida: ${descricao}`);
  return { descricao, url: page.url() };
}
