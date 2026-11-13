import type { Page } from '@playwright/test';
import { TURMA_ALTERNATIVA, type BuildTurmaAlternativaOptions } from '../factories/turma-alternativa.factory';
import { navegarParaAdicionarTurmaAlternativa } from '../helpers/navigation/turma-alternativa.navigation';
import {
  criarTurmaTipo,
  type CriarTurmaTipoHooks,
  type TurmaTipoActionConfig,
  type TurmaTipoCriada,
  type TurmaTipoIdentificador,
} from './turma-tipo.action';

export const CONFIG_ACAO_TURMA_ALTERNATIVA: TurmaTipoActionConfig = {
  factory: TURMA_ALTERNATIVA,
  tipoNaGrade: 'Alternativa',
  navegarParaAdicionar: navegarParaAdicionarTurmaAlternativa,
};

export type TurmaAlternativaCriada = TurmaTipoCriada;
export type TurmaAlternativaIdentificador = TurmaTipoIdentificador;
export type CriarTurmaAlternativaHooks = CriarTurmaTipoHooks;

/** Cria uma Turma Alternativa pela UI, escolhe o modo de salvamento e confirma a persistência. */
export function criarTurmaAlternativa(
  page: Page,
  options: BuildTurmaAlternativaOptions = {},
  sequencia = 1,
  hooks: CriarTurmaAlternativaHooks = {},
): Promise<TurmaAlternativaCriada> {
  return criarTurmaTipo(page, CONFIG_ACAO_TURMA_ALTERNATIVA, options, sequencia, hooks);
}
