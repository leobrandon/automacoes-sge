import { expect, test } from '@playwright/test';
import { buildJustificativaPonto, isJustificativaPontoQAAuto } from '../../../../src/factories/justificativa-ponto.factory';
import {
  lerConfiguracaoCriacaoJustificativaPonto,
  lerConfiguracaoExclusaoJustificativaPonto,
} from './justificativa_ponto_config';

test('monta Justificativa com descrição QAAUTO sequenciada e padrões do SGE', () => {
  expect(buildJustificativaPonto({}, 1)).toEqual({
    descricao: 'QAAUTO Justificativa Ponto 1',
    sigla: 'QA1',
    codigo: '',
    prazo: '',
    tipo: 'Não remunerada',
    disponivelParaUnidades: 'Sim',
    disponivelNaPreFolha: 'Não',
    sequencia: 1,
  });
  expect(buildJustificativaPonto({ descricao: ' QAAUTO Base ' }, 3).descricao).toBe('QAAUTO Base 3');
});

test('sufixa o código com a sequência e respeita os limites do formulário', () => {
  expect(buildJustificativaPonto({ codigo: 'QACOD' }, 2).codigo).toBe('QACOD-2');
  expect(() => buildJustificativaPonto({ sigla: 'ABCDEF' })).toThrow(/excede 5/);
  expect(() => buildJustificativaPonto({}, 1000)).toThrow(/excede 5/);
  expect(() => buildJustificativaPonto({ prazo: '12345' })).toThrow(/dígitos/);
  expect(() => buildJustificativaPonto({ descricao: `QAAUTO ${'x'.repeat(250)}` })).toThrow(/250/);
});

test('rejeita sequência inválida e descrição sem QAAUTO', () => {
  expect(() => buildJustificativaPonto({}, 0)).toThrow();
  expect(() => buildJustificativaPonto({ descricao: 'Sem prefixo' }, 1)).toThrow(/QAAUTO/);
  expect(isJustificativaPontoQAAuto(' qaauto x')).toBe(true);
  expect(isJustificativaPontoQAAuto('Licença Paternidade')).toBe(false);
});

test('lê os JSONs de criação e exclusão', () => {
  expect(lerConfiguracaoCriacaoJustificativaPonto().quantidade).toBeGreaterThanOrEqual(1);
  expect(lerConfiguracaoExclusaoJustificativaPonto().termoGeral).toBe('QAAUTO');
});
