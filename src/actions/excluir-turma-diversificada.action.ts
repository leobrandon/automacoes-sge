import type { Page } from '@playwright/test';
import { CONFIG_ACAO_TURMA_DIVERSIFICADA, type TurmaDiversificadaIdentificador } from './criar-turma-diversificada.action';
import { excluirTurmaTipo, type TurmaTipoExcluida } from './turma-tipo.action';

export type TurmaDiversificadaExcluida = TurmaTipoExcluida;

/** Exclui somente a Turma Diversificada QAAUTO retornada pela ação de criação desta execução. */
export function excluirTurmaDiversificada(page: Page, criada: TurmaDiversificadaIdentificador): Promise<TurmaDiversificadaExcluida> {
  return excluirTurmaTipo(page, CONFIG_ACAO_TURMA_DIVERSIFICADA, criada);
}
