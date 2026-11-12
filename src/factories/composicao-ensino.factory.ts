import { fakeData } from '../helpers/generators/fake-data';

export const NIVEIS_ENSINO_COMPOSICAO = [
  'Educação Infantil',
  'Educação Fundamental',
  'Ensino Médio',
  'Ensino Superior',
  'Cursos Livres',
  'Parte Diversificada',
] as const;

export const MODALIDADES_ENSINO_COMPOSICAO = [
  'Ensino Regular',
  'Educação Especial',
  'Educação de Jovens e Adultos (EJA)',
  'Educação Profissional',
] as const;

export const FASES_ENSINO_COMPOSICAO = ['Anos iniciais', 'Anos finais'] as const;
export const OPCOES_SIM_NAO = ['Sim', 'Não'] as const;

export type NivelEnsinoComposicao = typeof NIVEIS_ENSINO_COMPOSICAO[number];
export type ModalidadeEnsinoComposicao = typeof MODALIDADES_ENSINO_COMPOSICAO[number];
export type FaseEnsinoComposicao = typeof FASES_ENSINO_COMPOSICAO[number];
export type OpcaoSimNao = typeof OPCOES_SIM_NAO[number];

export interface ComposicaoEnsinoData {
  descricao: string;
  abreviacao: string;
  codigoTurma: string;
  descricaoHistorico: string;
  codigoExterno: string;
  nivelEnsino: NivelEnsinoComposicao;
  modalidadeEnsino: ModalidadeEnsinoComposicao;
  faseEnsino?: FaseEnsinoComposicao;
  ativo: OpcaoSimNao;
  validarHorarioConteudoAplicado: OpcaoSimNao;
}

export type BuildComposicaoEnsinoOptions = Partial<ComposicaoEnsinoData>;

interface ModeloComposicaoEnsino {
  descricao: string;
  abreviacao: string;
  descricaoHistorico: string;
  codigoTurmaPrefixo: string;
  nivelEnsino: NivelEnsinoComposicao;
  modalidadeEnsino: ModalidadeEnsinoComposicao;
  faseEnsino?: FaseEnsinoComposicao;
}

/** Valores educacionais coerentes usados quando o JSON deixa os campos vazios. */
export const MODELOS_COMPOSICAO_ENSINO: readonly ModeloComposicaoEnsino[] = [
  {
    descricao: 'QAAUTO - Educação Infantil - Creche Integral',
    abreviacao: 'QA-EICI',
    descricaoHistorico: 'Educação Infantil - Creche',
    codigoTurmaPrefixo: 'EI',
    nivelEnsino: 'Educação Infantil',
    modalidadeEnsino: 'Ensino Regular',
  },
  {
    descricao: 'QAAUTO - Educação Infantil - Pré-Escola',
    abreviacao: 'QA-EIPE',
    descricaoHistorico: 'Educação Infantil - Pré-Escola',
    codigoTurmaPrefixo: 'PE',
    nivelEnsino: 'Educação Infantil',
    modalidadeEnsino: 'Ensino Regular',
  },
  {
    descricao: 'QAAUTO - Educação Fundamental - Anos Iniciais',
    abreviacao: 'QA-EFAI',
    descricaoHistorico: 'Ensino Fundamental - Anos Iniciais',
    codigoTurmaPrefixo: 'FA',
    nivelEnsino: 'Educação Fundamental',
    modalidadeEnsino: 'Ensino Regular',
    faseEnsino: 'Anos iniciais',
  },
  {
    descricao: 'QAAUTO - Educação Fundamental - Anos Finais',
    abreviacao: 'QA-EFAF',
    descricaoHistorico: 'Ensino Fundamental - Anos Finais',
    codigoTurmaPrefixo: 'FF',
    nivelEnsino: 'Educação Fundamental',
    modalidadeEnsino: 'Ensino Regular',
    faseEnsino: 'Anos finais',
  },
  {
    descricao: 'QAAUTO - Educação Fundamental - EJA',
    abreviacao: 'QA-EFJA',
    descricaoHistorico: 'Ensino Fundamental - EJA',
    codigoTurmaPrefixo: 'EJ',
    nivelEnsino: 'Educação Fundamental',
    modalidadeEnsino: 'Educação de Jovens e Adultos (EJA)',
    faseEnsino: 'Anos iniciais',
  },
  {
    descricao: 'QAAUTO - Educação Fundamental - Educação Especial',
    abreviacao: 'QA-EFEE',
    descricaoHistorico: 'Educação Fundamental - Educação Especial',
    codigoTurmaPrefixo: 'EE',
    nivelEnsino: 'Educação Fundamental',
    modalidadeEnsino: 'Educação Especial',
    faseEnsino: 'Anos iniciais',
  },
  {
    descricao: 'QAAUTO - Ensino Médio Regular',
    abreviacao: 'QA-EMR',
    descricaoHistorico: 'Ensino Médio',
    codigoTurmaPrefixo: 'ME',
    nivelEnsino: 'Ensino Médio',
    modalidadeEnsino: 'Ensino Regular',
  },
];

const MODALIDADE_PADRAO_POR_NIVEL: Record<NivelEnsinoComposicao, ModalidadeEnsinoComposicao> = {
  'Educação Infantil': 'Ensino Regular',
  'Educação Fundamental': 'Ensino Regular',
  'Ensino Médio': 'Ensino Regular',
  'Ensino Superior': 'Educação Profissional',
  'Cursos Livres': 'Educação Profissional',
  'Parte Diversificada': 'Ensino Regular',
};

const NIVEL_PADRAO_POR_MODALIDADE: Partial<Record<ModalidadeEnsinoComposicao, NivelEnsinoComposicao>> = {
  'Educação Especial': 'Educação Fundamental',
  'Educação de Jovens e Adultos (EJA)': 'Educação Fundamental',
  'Educação Profissional': 'Ensino Médio',
};

function adicionarSufixoSequencial(valor: string, sequencia: number): string {
  return `${valor.trim()} ${sequencia}`;
}

/** Gera os dados do formulário, mantendo descrições únicas em execuções em lote. */
export function buildComposicaoEnsino(
  options: BuildComposicaoEnsinoOptions = {},
  sequencia = 1,
): ComposicaoEnsinoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência da Composição de Ensino deve ser um inteiro positivo.');
  }

  const modelos = MODELOS_COMPOSICAO_ENSINO.filter((item) =>
    (!options.nivelEnsino || item.nivelEnsino === options.nivelEnsino)
    && (!options.modalidadeEnsino || item.modalidadeEnsino === options.modalidadeEnsino)
    && (!options.faseEnsino || item.faseEnsino === options.faseEnsino),
  );
  const modeloBase = MODELOS_COMPOSICAO_ENSINO.filter((item) =>
    options.nivelEnsino ? item.nivelEnsino === options.nivelEnsino : true,
  );
  const candidatos = modelos.length > 0
    ? modelos
    : modeloBase.length > 0
      ? modeloBase
      : MODELOS_COMPOSICAO_ENSINO;
  const modelo = fakeData.faker.helpers.arrayElement(candidatos);
  const nivelEnsino = options.nivelEnsino
    || (options.modalidadeEnsino && !MODELOS_COMPOSICAO_ENSINO.some((item) => item.modalidadeEnsino === options.modalidadeEnsino)
      ? NIVEL_PADRAO_POR_MODALIDADE[options.modalidadeEnsino] || modelo.nivelEnsino
      : modelo.nivelEnsino);
  const modalidadeEnsino = options.modalidadeEnsino
    || (modelo.nivelEnsino === nivelEnsino
      ? modelo.modalidadeEnsino
      : MODALIDADE_PADRAO_POR_NIVEL[nivelEnsino]);
  const codigoTurmaPrefixo = modelo.nivelEnsino === nivelEnsino
    ? modelo.codigoTurmaPrefixo
    : ({
      'Educação Infantil': 'EI',
      'Educação Fundamental': 'EF',
      'Ensino Médio': 'EM',
      'Ensino Superior': 'ES',
      'Cursos Livres': 'CL',
      'Parte Diversificada': 'PD',
    } satisfies Record<NivelEnsinoComposicao, string>)[nivelEnsino];
  const abreviacaoBase = options.abreviacao?.trim()
    || (modelo.nivelEnsino === nivelEnsino ? modelo.abreviacao : `QA-${codigoTurmaPrefixo}`);
  const descricaoHistoricoBase = options.descricaoHistorico?.trim()
    || (modelo.nivelEnsino === nivelEnsino ? modelo.descricaoHistorico : nivelEnsino);
  const faseEnsino = options.faseEnsino
    || (nivelEnsino === 'Educação Fundamental'
      ? (modelo.nivelEnsino === nivelEnsino ? modelo.faseEnsino : 'Anos iniciais')
      : undefined);
  const descricaoBase = options.descricao?.trim()
    || (modelo.nivelEnsino === nivelEnsino
      ? modelo.descricao
      : `QAAUTO - ${nivelEnsino} - ${modalidadeEnsino}`);
  if (!/^QAAUTO\b/i.test(descricaoBase)) {
    throw new Error('A descrição da Composição de Ensino deve começar com "QAAUTO".');
  }

  const abreviacao = options.abreviacao?.trim() || `${abreviacaoBase}${sequencia}`;
  const codigoTurma = options.codigoTurma?.trim() || `${codigoTurmaPrefixo}${String(sequencia).padStart(2, '0')}`;
  const codigoExterno = options.codigoExterno?.trim() || `QA${fakeData.faker.string.numeric(8)}`;
  const descricaoHistorico = descricaoHistoricoBase;
  const descricao = adicionarSufixoSequencial(descricaoBase, sequencia);

  if (descricao.length > 100) throw new Error('A Descrição da Composição de Ensino deve ter até 100 caracteres.');
  if (abreviacao.length > 10) throw new Error('A Abreviação da Composição de Ensino deve ter até 10 caracteres.');
  if (codigoTurma.length > 5) throw new Error('O Código para Turma deve ter até 5 caracteres.');
  if (descricaoHistorico.length > 100) throw new Error('A Descrição Histórico deve ter até 100 caracteres.');
  if (codigoExterno.length > 10) throw new Error('O Código Externo deve ter até 10 caracteres.');

  return {
    descricao,
    abreviacao,
    codigoTurma,
    descricaoHistorico,
    codigoExterno,
    nivelEnsino,
    modalidadeEnsino,
    faseEnsino,
    ativo: options.ativo || 'Sim',
    validarHorarioConteudoAplicado: options.validarHorarioConteudoAplicado || 'Não',
  };
}

/** Identifica descrições que contêm o marcador de dados de automação. */
export function isComposicaoEnsinoQAAuto(descricao: string): boolean {
  return /QAAUTO/i.test(descricao.trim());
}

/** As descrições novas seguem o padrão do projeto com QAAUTO no início. */
export function startsWithQAAUTO(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
