import { expect, test } from '@playwright/test';
import {
  buildCategoriaDaTurma,
  EXEMPLOS_CATEGORIA_DA_TURMA,
  isDescricaoCategoriaDaTurmaQAAuto,
  obterDescricaoBaseCategoriaDaTurma,
} from '../../../src/factories/categoria-da-turma.factory';

test.describe('Factory de Categoria da Turma', () => {
  test('acrescenta a sequência ao nome configurado', () => {
    expect(buildCategoriaDaTurma({ descricao: 'QAAUTO - Turma Integral' }, 3).descricao)
      .toBe('QAAUTO - Turma Integral 3');
  });

  test('escolhe uma categoria temática quando a descrição está em branco', () => {
    const descricaoBase = obterDescricaoBaseCategoriaDaTurma('');

    expect(EXEMPLOS_CATEGORIA_DA_TURMA).toContain(descricaoBase);
    expect(buildCategoriaDaTurma({ descricao: descricaoBase }, 1).descricao)
      .toBe(`${descricaoBase} 1`);
  });

  test('aceita somente sequências positivas e descrições QAAUTO numeradas para exclusão', () => {
    expect(() => buildCategoriaDaTurma({ descricao: 'QAAUTO - Turma Integral' }, 0)).toThrow(/inteiro positivo/);
    expect(isDescricaoCategoriaDaTurmaQAAuto('QAAUTO - Turma Integral 1')).toBe(true);
    expect(isDescricaoCategoriaDaTurmaQAAuto('QAAUTO - Turma Integral')).toBe(false);
    expect(isDescricaoCategoriaDaTurmaQAAuto('Turma Integral 1')).toBe(false);
  });
});
