import type { Page } from '@playwright/test';
import { CONFIG_ACAO_TURMA_ALTERNATIVA, type TurmaAlternativaIdentificador } from './criar-turma-alternativa.action';
import { excluirTurmaTipo, type TurmaTipoExcluida } from './turma-tipo.action';

export type TurmaAlternativaExcluida = TurmaTipoExcluida;

/** Exclui somente a Turma Alternativa QAAUTO retornada pela ação de criação desta execução. */
export function excluirTurmaAlternativa(page: Page, criada: TurmaAlternativaIdentificador): Promise<TurmaAlternativaExcluida> {
  return excluirTurmaTipo(page, CONFIG_ACAO_TURMA_ALTERNATIVA, criada);
}
