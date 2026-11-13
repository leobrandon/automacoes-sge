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

/** Turma Diversificada (Escola > Turma > Adicionar > Diversificada). A descrição aceita até 200 caracteres. */
export const TURMA_DIVERSIFICADA: TurmaTipoFactoryConfig = {
  nome: 'Turma Diversificada',
  descricaoPadrao: 'QAAUTO Turma Diversificada',
  limiteDescricao: 200,
};

export const SITUACOES_DE_SALVAMENTO_TURMA_DIVERSIFICADA = SITUACOES_DE_SALVAMENTO_TURMA;
export const MEDIACOES_TURMA_DIVERSIFICADA = MEDIACOES_TURMA;
export type SituacaoDesejadaTurmaDiversificada = SituacaoDesejadaTurma;
export type MediacaoTurmaDiversificada = MediacaoTurma;
export type TurmaDiversificadaData = TurmaTipoData;
export type BuildTurmaDiversificadaOptions = BuildTurmaTipoOptions;

export function buildTurmaDiversificada(options: BuildTurmaDiversificadaOptions = {}, sequencia = 1): TurmaDiversificadaData {
  return buildTurmaTipo(TURMA_DIVERSIFICADA, options, sequencia);
}

export const isTurmaDiversificadaQAAuto = isTurmaQAAuto;
