import { expect, test } from '@playwright/test';
import { buildOcorrenciaSaudeColaborador } from '../../../src/factories/ocorrencia-saude-colaborador.factory';

const hoje = new Date('2026-11-18T01:00:00Z');
const base = { escola: 'Escola de teste', colaborador: 'Colaborador QAAUTO', justificativa: 'Abono' };

test('preenche a data de São Paulo, um dia e o motivo QAAUTO por padrão', () => {
  const dados = buildOcorrenciaSaudeColaborador(base, hoje);
  expect(dados.dataInicio).toBe('17/11/2026');
  expect(dados.totalDias).toBe(1);
  expect(dados.motivoCancelamento).toMatch(/^QAAUTO\b/);
});

test('exige colaborador de teste e data válida do ano corrente ou posterior', () => {
  expect(() => buildOcorrenciaSaudeColaborador({ ...base, colaborador: 'Colaborador' }, hoje)).toThrow(/QAAUTO/);
  expect(() => buildOcorrenciaSaudeColaborador({ ...base, dataInicio: '31/02/2026' }, hoje)).toThrow(/data de início válida/);
  expect(() => buildOcorrenciaSaudeColaborador({ ...base, dataInicio: '31/12/2025' }, hoje)).toThrow(/ano corrente/);
});
