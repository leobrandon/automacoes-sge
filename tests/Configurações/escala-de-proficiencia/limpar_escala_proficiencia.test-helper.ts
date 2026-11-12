import type { Page } from '@playwright/test';
import type { EscalaProficienciaCriada } from '../../../src/actions/criar-escala-proficiencia.action';
import { excluirEscalaProficiencia } from '../../../src/actions/excluir-escala-proficiencia.action';
import {
  linhaEscalaProficiencia,
  pesquisarEscalaProficiencia,
} from '../../../src/helpers/navigation/escala-proficiencia.navigation';

export async function limparEscalaCriada(page: Page, escala?: EscalaProficienciaCriada): Promise<void> {
  if (!escala) return;
  await pesquisarEscalaProficiencia(page, escala.codigo);
  if (await linhaEscalaProficiencia(page, escala.codigo).count() > 0) {
    await excluirEscalaProficiencia(page, escala);
  }
}
