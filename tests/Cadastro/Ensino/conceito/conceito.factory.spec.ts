import { expect, test } from '@playwright/test';
import { buildConceito, DESCRICOES_CONCEITO, isConceitoQAAuto } from '../../../../src/factories/conceito.factory';

test('escolhe uma das seis descrições de Conceito e mantém a sequência ao final', () => {
  const conceito = buildConceito({}, 7);

  expect(conceito.descricao).toMatch(/^QAAUTO Conceito de .+ 7$/);
  expect(DESCRICOES_CONCEITO.some((nome) => conceito.descricao === `QAAUTO ${nome} 7`)).toBe(true);
  expect(conceito.descricao).not.toMatch(/-[A-Z0-9]{6,}/);
  expect(isConceitoQAAuto(conceito.descricao)).toBe(true);
});

test('mantém a descrição base configurada e acrescenta somente a sequência', () => {
  expect(buildConceito({ descricao: 'QAAUTO Conceito Inclusivo' }, 3).descricao)
    .toBe('QAAUTO Conceito Inclusivo 3');
});

