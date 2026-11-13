/**
 * Regras comuns das turmas cadastradas pela mesma tela (Diversificada, Alternativa): cascata de apoio do tenant,
 * descrição QAAUTO sequencial, mediação e modo de salvamento. Cada tipo só informa nome, descrição padrão e limite.
 */
export const SITUACOES_DE_SALVAMENTO_TURMA = ['Ativo', 'Rascunho'] as const;

export const MEDIACOES_TURMA = [
  'Presencial',
  'Semipresencial',
  'Educação a distância - EAD',
] as const;

export type SituacaoDesejadaTurma = typeof SITUACOES_DE_SALVAMENTO_TURMA[number];
export type MediacaoTurma = typeof MEDIACOES_TURMA[number];

/**
 * Obrigatórios da tela (asterisco): Escola, Ano Letivo, Calendário Escolar, Composição de Ensino, Ano Escolar,
 * Turno, Descrição, Mediação, Local de funcionamento e Carga Horária (o SGE preenche a carga sozinho a partir da
 * composição/ano escolar). Os dados de apoio vêm do tenant e não são criados aqui.
 */
export interface TurmaTipoData {
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
  mediacaoDidaticoPedagogica: MediacaoTurma;
  localFuncionamentoDiferenciado: string;
  situacaoDesejada: SituacaoDesejadaTurma;
}

export type BuildTurmaTipoOptions = Partial<Omit<TurmaTipoData, 'descricao'>> & {
  descricao?: string;
};

export interface TurmaTipoFactoryConfig {
  /** Nome do tipo nas mensagens, ex.: "Turma Alternativa". */
  nome: string;
  /** Base da descrição quando o JSON não informa uma; sempre começa com QAAUTO. */
  descricaoPadrao: string;
  limiteDescricao: number;
}

export function isTurmaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}

function obrigatorio(valor: string | undefined, campo: string, nome: string): string {
  const texto = valor?.trim();
  if (!texto) throw new Error(`Informe "${campo}" nos dados da ${nome}.`);
  return texto;
}

export function buildTurmaTipo(
  config: TurmaTipoFactoryConfig,
  options: BuildTurmaTipoOptions = {},
  sequencia = 1,
): TurmaTipoData {
  const { nome } = config;
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error(`A sequência de ${nome} deve ser um inteiro positivo.`);
  }

  const base = options.descricao?.trim() || config.descricaoPadrao;
  if (!isTurmaQAAuto(base)) {
    throw new Error(`A descrição da ${nome} deve começar com QAAUTO.`);
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > config.limiteDescricao) {
    throw new Error(`A descrição da ${nome} deve ter até ${config.limiteDescricao} caracteres.`);
  }

  const situacaoDesejada = options.situacaoDesejada ?? 'Ativo';
  if (!SITUACOES_DE_SALVAMENTO_TURMA.includes(situacaoDesejada)) {
    throw new Error(`"situacaoDesejada" deve ser uma destas opções: ${SITUACOES_DE_SALVAMENTO_TURMA.join(', ')}.`);
  }

  const mediacao = options.mediacaoDidaticoPedagogica ?? 'Presencial';
  if (!MEDIACOES_TURMA.includes(mediacao)) {
    throw new Error(`"mediacaoDidaticoPedagogica" deve ser uma destas opções: ${MEDIACOES_TURMA.join(', ')}.`);
  }

  return {
    diretoriaRegional: obrigatorio(options.diretoriaRegional, 'diretoriaRegional', nome),
    municipio: obrigatorio(options.municipio, 'municipio', nome),
    unidadeEducacional: obrigatorio(options.unidadeEducacional, 'unidadeEducacional', nome),
    // Sem padrão: o ano letivo existente varia por tenant e um valor fixo envelhece.
    anoLetivo: obrigatorio(options.anoLetivo, 'anoLetivo', nome),
    calendarioEscolar: obrigatorio(options.calendarioEscolar, 'calendarioEscolar', nome),
    composicaoEnsino: obrigatorio(options.composicaoEnsino, 'composicaoEnsino', nome),
    anoEscolar: obrigatorio(options.anoEscolar, 'anoEscolar', nome),
    turno: obrigatorio(options.turno, 'turno', nome),
    descricao,
    mediacaoDidaticoPedagogica: mediacao,
    localFuncionamentoDiferenciado:
      options.localFuncionamentoDiferenciado?.trim() || 'A turma não está em local de funcionamento diferenciado',
    situacaoDesejada,
  };
}
