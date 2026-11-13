import {
  buildTurmaTipo,
  isTurmaQAAuto,
  MEDIACOES_TURMA,
  SITUACOES_DE_SALVAMENTO_TURMA,
  type BuildTurmaTipoOptions,
  type MediacaoTurma,
  type SituacaoDesejadaTurma,
  type TurmaTipoData,
  type TurmaTipoFactoryConfig,
} from './turma-tipo.factory';

/** Turma Alternativa (Escola > Turma > Adicionar > Alternativa). A descrição aceita até 80 caracteres. */
export const TURMA_ALTERNATIVA: TurmaTipoFactoryConfig = {
  nome: 'Turma Alternativa',
  descricaoPadrao: 'QAAUTO Turma Alternativa',
  limiteDescricao: 80,
};

export const SITUACOES_DE_SALVAMENTO_TURMA_ALTERNATIVA = SITUACOES_DE_SALVAMENTO_TURMA;
export const MEDIACOES_TURMA_ALTERNATIVA = MEDIACOES_TURMA;
export type SituacaoDesejadaTurmaAlternativa = SituacaoDesejadaTurma;
export type MediacaoTurmaAlternativa = MediacaoTurma;
export type TurmaAlternativaData = TurmaTipoData;
export type BuildTurmaAlternativaOptions = BuildTurmaTipoOptions;

export function buildTurmaAlternativa(options: BuildTurmaAlternativaOptions = {}, sequencia = 1): TurmaAlternativaData {
  return buildTurmaTipo(TURMA_ALTERNATIVA, options, sequencia);
}

export const isTurmaAlternativaQAAuto = isTurmaQAAuto;
