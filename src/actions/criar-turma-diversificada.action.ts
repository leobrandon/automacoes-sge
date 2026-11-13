import type { Page } from '@playwright/test';
import { TURMA_DIVERSIFICADA, type BuildTurmaDiversificadaOptions } from '../factories/turma-diversificada.factory';
import { navegarParaAdicionarTurmaDiversificada } from '../helpers/navigation/turma-diversificada.navigation';
import {
  criarTurmaTipo,
  type CriarTurmaTipoHooks,
  type TurmaTipoActionConfig,
  type TurmaTipoCriada,
  type TurmaTipoIdentificador,
} from './turma-tipo.action';

export const CONFIG_ACAO_TURMA_DIVERSIFICADA: TurmaTipoActionConfig = {
  factory: TURMA_DIVERSIFICADA,
  tipoNaGrade: 'Diversificada',
  navegarParaAdicionar: navegarParaAdicionarTurmaDiversificada,
};

export type TurmaDiversificadaCriada = TurmaTipoCriada;
export type TurmaDiversificadaIdentificador = TurmaTipoIdentificador;
export type CriarTurmaDiversificadaHooks = CriarTurmaTipoHooks;

/** Cria uma Turma Diversificada pela UI, escolhe o modo de salvamento e confirma a persistência. */
export function criarTurmaDiversificada(
  page: Page,
  options: BuildTurmaDiversificadaOptions = {},
  sequencia = 1,
  hooks: CriarTurmaDiversificadaHooks = {},
): Promise<TurmaDiversificadaCriada> {
  return criarTurmaTipo(page, CONFIG_ACAO_TURMA_DIVERSIFICADA, options, sequencia, hooks);
}
