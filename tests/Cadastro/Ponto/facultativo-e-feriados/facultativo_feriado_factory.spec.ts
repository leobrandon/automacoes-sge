import { expect, test } from '@playwright/test';
import {
  buildFacultativoFeriado,
  isFacultativoFeriadoQAAuto,
  somarDiasFacultativoFeriado,
} from '../../../../src/factories/facultativo-feriado.factory';
import {
  lerConfiguracaoCriacaoFacultativoFeriado,
  lerConfiguracaoExclusaoFacultativoFeriado,
} from './facultativo_feriado_config';

test('monta Feriado com descrição QAAUTO sequenciada e data deterministicamente avançada', () => {
  expect(buildFacultativoFeriado({}, 1)).toEqual({
    descricao: 'QAAUTO Feriado 1',
    data: '01/03/2030',
    facultativo: false,
    sequencia: 1,
  });
  expect(buildFacultativoFeriado({ descricao: ' QAAUTO Base ', data: '28/02/2030' }, 3)).toEqual({
    descricao: 'QAAUTO Base 3',
    data: '02/03/2030',
    facultativo: false,
    sequencia: 3,
  });
});

test('usa o nome padrão Facultativo quando o indicador é marcado', () => {
  const facultativo = buildFacultativoFeriado({ facultativo: true }, 2);
  expect(facultativo.descricao).toBe('QAAUTO Facultativo 2');
  expect(facultativo.facultativo).toBe(true);
});

test('soma dias respeitando virada de mês, de ano e ano bissexto', () => {
  expect(somarDiasFacultativoFeriado('31/12/2029', 1)).toBe('01/01/2030');
  expect(somarDiasFacultativoFeriado('28/02/2032', 1)).toBe('29/02/2032');
  expect(somarDiasFacultativoFeriado('28/02/2030', 1)).toBe('01/03/2030');
});

test('recusa sequência inválida, descrição sem QAAUTO, data inválida e descrição acima do limite', () => {
  expect(() => buildFacultativoFeriado({}, 0)).toThrow(/inteiro positivo/i);
  expect(() => buildFacultativoFeriado({ descricao: 'Natal' }, 1)).toThrow(/QAAUTO/i);
  expect(() => buildFacultativoFeriado({ data: '2030-03-01' }, 1)).toThrow(/DD\/MM\/AAAA/);
  expect(() => buildFacultativoFeriado({ data: '31/02/2030' }, 1)).toThrow(/não existe/i);
  expect(() => buildFacultativoFeriado({ descricao: `QAAUTO ${'X'.repeat(245)}` }, 1)).toThrow(/250 caracteres/i);
  expect(isFacultativoFeriadoQAAuto(' QAAUTO Feriado 1 ')).toBe(true);
  expect(isFacultativoFeriadoQAAuto('Natal')).toBe(false);
});

test('carrega e valida os JSONs de criação e exclusão', () => {
  const criacao = lerConfiguracaoCriacaoFacultativoFeriado();
  expect(criacao.quantidade).toBeGreaterThanOrEqual(1);
  expect(buildFacultativoFeriado(criacao.dados, 1).descricao).toMatch(/^QAAUTO\b/);

  const exclusao = lerConfiguracaoExclusaoFacultativoFeriado();
  expect(typeof exclusao.excluirTodasQAAUTO).toBe('boolean');
  expect(exclusao.termoGeral.toUpperCase()).toBe('QAAUTO');
});
