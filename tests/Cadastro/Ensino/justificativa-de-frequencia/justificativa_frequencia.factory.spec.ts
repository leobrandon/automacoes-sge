import { expect, test } from '@playwright/test';
import {
  buildJustificativaFrequencia,
  isJustificativaFrequenciaQAAuto,
} from '../../../../src/factories/justificativa-frequencia.factory';

test('gera descrição QAAUTO sequenciada e traduz Abono Sim/Não para booleanos', () => {
  const opcoes = {
    descricao: 'QAAUTO Justificativa de Frequência',
    abonoPorSequencia: ['Sim', 'Não'] as const,
    ativa: 'Sim' as const,
  };

  expect(buildJustificativaFrequencia(opcoes, 1)).toEqual({
    descricao: 'QAAUTO Justificativa de Frequência 1',
    abonaFalta: true,
    ativa: true,
  });
  expect(buildJustificativaFrequencia(opcoes, 2)).toEqual({
    descricao: 'QAAUTO Justificativa de Frequência 2',
    abonaFalta: false,
    ativa: true,
  });
});

test('usa Abono Não e Ativa Sim quando não há valores opcionais', () => {
  expect(buildJustificativaFrequencia({}, 1)).toEqual({
    descricao: 'QAAUTO Justificativa de Frequência 1',
    abonaFalta: false,
    ativa: true,
  });
});

test('mantém a descrição base e acrescenta somente a sequência pedida', () => {
  expect(buildJustificativaFrequencia({ descricao: 'QAAUTO Abono por consulta' }, 4).descricao)
    .toBe('QAAUTO Abono por consulta 4');
});

test('rejeita sequência zero, base sem QAAUTO e sequência Abono ausente', () => {
  expect(() => buildJustificativaFrequencia({}, 0)).toThrow(/sequência/i);
  expect(() => buildJustificativaFrequencia({ descricao: 'Justificativa' }, 1)).toThrow(/QAAUTO/i);
  expect(() => buildJustificativaFrequencia({ abonoPorSequencia: ['Sim'] }, 2)).toThrow(/Abono/i);
});

test('rejeita opções de Abono desconhecidas', () => {
  expect(() => buildJustificativaFrequencia({ abonoPorSequencia: ['Talvez' as 'Sim'] }, 1))
    .toThrow(/Sim.*Não/i);
});

test('reconhece apenas descrições QAAUTO', () => {
  expect(isJustificativaFrequenciaQAAuto('QAAUTO Justificativa 1')).toBe(true);
  expect(isJustificativaFrequenciaQAAuto('Justificativa 1')).toBe(false);
});
