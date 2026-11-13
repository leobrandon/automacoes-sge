import { expect, test } from '@playwright/test';
import { validarExclusaoTurmasAee } from '../../../../src/actions/excluir-turmas-aee-configuradas.action';

test('exige alvo completo ou lote explicitamente ativado', () => {
  expect(() => validarExclusaoTurmasAee({ excluirTodasQAAUTO: false, descricao: '', escola: '', calendario: '' })).toThrow(/individual/i);
  expect(() => validarExclusaoTurmasAee({ excluirTodasQAAUTO: 'true', descricao: '', escola: '', calendario: '' })).toThrow(/true ou false/i);
  expect(() => validarExclusaoTurmasAee({ excluirTodasQAAUTO: true, descricao: 'QAAUTO exemplo', escola: '', calendario: '' })).toThrow(/modo lote/i);
  expect(validarExclusaoTurmasAee({ excluirTodasQAAUTO: true, descricao: '', escola: '', calendario: '' }).excluirTodasQAAUTO).toBe(true);
  expect(validarExclusaoTurmasAee({ excluirTodasQAAUTO: false, descricao: ' Turma ', escola: ' Escola ', calendario: ' Calendário ' }).descricao).toBe('Turma');
});
