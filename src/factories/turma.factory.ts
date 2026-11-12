/**
 * Contrato de dados para cadastro de Turma do tipo Escolarização no SGE.
 * Mapeado diretamente dos campos da tela /turma/editar/0?tipoDeTurma=0.
 */
export interface TurmaEscolarizacaoData {
  /** Secretaria de Educação/Diretoria Regional. Opcional; em alguns tenants precisa ser escolhida antes de Município e Escola. */
  diretoriaRegional?: string;
  /** Município. Opcional; habilitado após a Diretoria Regional. */
  municipio?: string;
  /** Nome ou parte do texto da Unidade Educacional / Escola. Opcional (se omitido, usa a selecionada/logada). */
  unidadeEducacional?: string;
  /** Alias para unidadeEducacional */
  escola?: string;
  /** Ano Letivo (ex.: '2026', '2025'). Padrão: '2026' */
  anoLetivo: string;
  /** Nome ou texto do Calendário Escolar (ex.: 'Calendário 2026'). */
  calendarioEscolar?: string;
  /** Composição de Ensino (ex.: 'CRECHE - Integral', 'ANOS INICIAIS - Parcial'). */
  composicaoEnsino?: string;
  /** Agrupamento/Ano (Série). Se omitido, seleciona o primeiro disponível para a composição. */
  agrupamentoAno?: string;
  /** Turno (ex.: 'Integral', 'Matutino', 'Vespertino', 'Noturno'). Padrão: 'Integral' */
  turno: string;
  /** Descrição identificadora da Turma (obrigatório). */
  descricao: string;
  /** Código INEP (opcional, apenas números). */
  codigoInep?: string;
  /** Horário de Entrada (HH:mm). Opcional, preenchido pelo Turno. */
  horarioEntrada?: string;
  /** Horário de Saída (HH:mm). Opcional, preenchido pelo Turno. */
  horarioSaida?: string;
  /** Mediação didático-pedagógica: 'Presencial' | 'Semipresencial' | 'EAD'. Padrão: 'Presencial'. */
  mediacaoDidaticoPedagogica: 'Presencial' | 'Semipresencial' | 'EAD';
  /** Local de funcionamento diferenciado. Padrão: 'A turma não está em local de funcionamento diferenciado'. */
  localFuncionamentoDiferenciado?: string;
  /** Tipo de Estrutura Curricular (ex.: 'CRECHE - INTEGRAL', 'ESCOLAS PARCIAIS FUND. INICIAIS'). */
  tipoEstruturaCurricular?: string;
  /** Estrutura Curricular específica. Se omitido, seleciona a primeira opção disponível. */
  estruturaCurricular?: string;
  /** Carga horária da turma. Se omitido, utiliza o cálculo automático da estrutura. */
  cargaHoraria?: string;
  /** Número de cópias da turma a serem geradas. Padrão: 1 */
  numeroCopias?: number;
  /** Modo de salvamento no modal SweetAlert: 'Ativo' | 'Rascunho'. Padrão: 'Ativo'. */
  situacaoDesejada: 'Ativo' | 'Rascunho';
}

export type BuildTurmaOptions = Partial<TurmaEscolarizacaoData>;

// A sequência parte de um valor derivado do relógio: o SGE rejeita descrição repetida no mesmo ano escolar/turno,
// e as turmas criadas por execuções anteriores continuam cadastradas.
let sequenciaTurma = Math.floor(Date.now() / 1000) % 1_000_000;

/**
 * Factory para geração de dados válidos de uma Turma de Escolarização.
 * Gera dados com descrição realista contendo prefixo QAAUTO e sufixo numérico único por execução.
 */
export function buildTurma(options: BuildTurmaOptions = {}): TurmaEscolarizacaoData {
  const numero = ++sequenciaTurma;

  const composicao = options.composicaoEnsino ?? 'CRECHE - Integral';
  const tipoEstruturaDefault = /creche/i.test(composicao) ? 'CRECHE - INTEGRAL' : undefined;

  return {
    unidadeEducacional: options.unidadeEducacional ?? options.escola,
    anoLetivo: options.anoLetivo ?? '2026',
    calendarioEscolar: options.calendarioEscolar ?? 'Calendário 2026',
    composicaoEnsino: composicao,
    agrupamentoAno: options.agrupamentoAno,
    turno: options.turno ?? 'Integral',
    descricao: options.descricao ?? `QAAUTO ${options.agrupamentoAno ? options.agrupamentoAno.trim() : (options.composicaoEnsino ?? 'Turma')} - ${options.turno ? options.turno.split('/')[0].trim() : 'Integral'} - ${numero}`,
    mediacaoDidaticoPedagogica: options.mediacaoDidaticoPedagogica ?? 'Presencial',
    localFuncionamentoDiferenciado: options.localFuncionamentoDiferenciado ?? 'não está em local de funcionamento diferenciado',
    tipoEstruturaCurricular: options.tipoEstruturaCurricular !== undefined ? options.tipoEstruturaCurricular : tipoEstruturaDefault,
    estruturaCurricular: options.estruturaCurricular,
    cargaHoraria: options.cargaHoraria,
    numeroCopias: options.numeroCopias ?? 1,
    situacaoDesejada: options.situacaoDesejada ?? 'Ativo',
    ...options,
  };
}
import { fakeData } from '../helpers/generators/fake-data';

