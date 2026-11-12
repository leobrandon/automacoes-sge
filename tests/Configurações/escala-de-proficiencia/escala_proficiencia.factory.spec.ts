import { expect, test } from '@playwright/test';
import { buildEscalaProficiencia } from '../../../src/factories/escala-proficiencia.factory';
import { configEscalaProficiencia } from './escala_proficiencia_config';

test('lê a configuração QAAUTO com faixa válida de pontuação e idade', () => {
  const escala = buildEscalaProficiencia(configEscalaProficiencia(), '261112');
  expect(escala.codigo).toBe('261112');
  expect(escala.descricao).toBe('QAAUTO Escala de Proficiência 261112');
  expect(escala.parametros).toHaveLength(1);
});

test('rejeita faixas de pontuação que se sobrepõem', () => {
  const dados = configEscalaProficiencia();
  expect(() => buildEscalaProficiencia({
    ...dados,
    parametros: [
      ...dados.parametros!,
      { ...dados.parametros![0], pontuacaoInicial: '10', pontuacaoFinal: '20' },
    ],
  }, '261113')).toThrow(/não podem se sobrepor/i);
});

test('rejeita códigos não numéricos e descrições que não identificam dados QAAUTO', () => {
  const dados = configEscalaProficiencia();
  expect(() => buildEscalaProficiencia(dados, 'QAAUTO')).toThrow(/1 a 19 dígitos/i);
  expect(() => buildEscalaProficiencia({ ...dados, descricao: 'Escala regular' }, '261114'))
    .toThrow(/começar com “QAAUTO”/i);
});
