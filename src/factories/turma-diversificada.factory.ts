export const SITUACOES_DE_SALVAMENTO_TURMA_DIVERSIFICADA = ['Ativo', 'Rascunho'] as const;

export const MEDIACOES_TURMA_DIVERSIFICADA = [
  'Presencial',
  'Semipresencial',
  'Educação a distância - EAD',
] as const;

export type SituacaoDesejadaTurmaDiversificada = typeof SITUACOES_DE_SALVAMENTO_TURMA_DIVERSIFICADA[number];
export type MediacaoTurmaDiversificada = typeof MEDIACOES_TURMA_DIVERSIFICADA[number];

const LIMITE_DESCRICAO = 200;

/**
 * Campos de /turmadiversificada/editar. Obrigatórios da tela (asterisco): Escola, Ano Letivo, Calendário Escolar,
 * Composição de Ensino, Ano Escolar, Turno, Descrição, Mediação e Local de funcionamento (quando Presencial).
 * Os dados de apoio (escola, calendário, composição, ano escolar e turno) vêm do tenant e não são criados aqui.
 */
export interface TurmaDiversificadaData {
  diretoriaRegional: string;
  municipio: string;
  /** Como o Select2 mostra: "NOME DA ESCOLA - código". */
  unidadeEducacional: string;
  anoLetivo: string;
  calendarioEscolar: string;
  composicaoEnsino: string;
  anoEscolar: string;
  turno: string;
  /** Chave de conferência QAAUTO: `QAAUTO <base> <sequência>`. O SGE grava a descrição em maiúsculas. */
  descricao: string;
  mediacaoDidaticoPedagogica: MediacaoTurmaDiversificada;
  localFuncionamentoDiferenciado: string;
  situacaoDesejada: SituacaoDesejadaTurmaDiversificada;
}

export type BuildTurmaDiversificadaOptions = Partial<Omit<TurmaDiversificadaData, 'descricao'>> & {
  descricao?: string;
};

function obrigatorio(valor: string | undefined, campo: string): string {
  const texto = valor?.trim();
  if (!texto) throw new Error(`Informe "${campo}" nos dados da Turma Diversificada.`);
  return texto;
}

export function buildTurmaDiversificada(
  options: BuildTurmaDiversificadaOptions = {},
  sequencia = 1,
): TurmaDiversificadaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Turma Diversificada deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Turma Diversificada';
  if (!isTurmaDiversificadaQAAuto(base)) {
    throw new Error('A descrição da Turma Diversificada deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição da Turma Diversificada deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  const situacaoDesejada = options.situacaoDesejada ?? 'Ativo';
  if (!SITUACOES_DE_SALVAMENTO_TURMA_DIVERSIFICADA.includes(situacaoDesejada)) {
    throw new Error(`"situacaoDesejada" deve ser uma destas opções: ${SITUACOES_DE_SALVAMENTO_TURMA_DIVERSIFICADA.join(', ')}.`);
  }

  const mediacao = options.mediacaoDidaticoPedagogica ?? 'Presencial';
  if (!MEDIACOES_TURMA_DIVERSIFICADA.includes(mediacao)) {
    throw new Error(`"mediacaoDidaticoPedagogica" deve ser uma destas opções: ${MEDIACOES_TURMA_DIVERSIFICADA.join(', ')}.`);
  }

  return {
    diretoriaRegional: obrigatorio(options.diretoriaRegional, 'diretoriaRegional'),
    municipio: obrigatorio(options.municipio, 'municipio'),
    unidadeEducacional: obrigatorio(options.unidadeEducacional, 'unidadeEducacional'),
    anoLetivo: options.anoLetivo?.trim() || '2026',
    calendarioEscolar: obrigatorio(options.calendarioEscolar, 'calendarioEscolar'),
    composicaoEnsino: obrigatorio(options.composicaoEnsino, 'composicaoEnsino'),
    anoEscolar: obrigatorio(options.anoEscolar, 'anoEscolar'),
    turno: obrigatorio(options.turno, 'turno'),
    descricao,
    mediacaoDidaticoPedagogica: mediacao,
    localFuncionamentoDiferenciado:
      options.localFuncionamentoDiferenciado?.trim() || 'A turma não está em local de funcionamento diferenciado',
    situacaoDesejada,
  };
}

export function isTurmaDiversificadaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
