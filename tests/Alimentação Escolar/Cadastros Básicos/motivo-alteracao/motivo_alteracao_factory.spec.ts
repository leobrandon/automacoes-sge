import { test, expect } from '@playwright/test';
import { buildMotivoAlteracao } from '../../../../src/factories/motivo-alteracao.factory';

test.describe('Factory: Motivo de Alteração (unitário)', () => {
  test('gera defaults válidos e prefixo obrigatório', () => {
    const dados = buildMotivoAlteracao();
    expect(dados.descricao).toMatch(/^QAAUTO\s+.+\s+-\s+\d+$/);
    expect(dados.descricao.length).toBeLessThanOrEqual(100);
    expect(dados.situacao).toBe('Ativo');
  });
  test('aceita descrição customizada QAAUTO', () => {
    expect(buildMotivoAlteracao({ descricao: 'QAAUTO AJUSTE 20260930' }).descricao).toBe('QAAUTO AJUSTE 20260930');
  });
  test('aceita situação Inativo', () => {
    expect(buildMotivoAlteracao({ situacao: 'Inativo' }).situacao).toBe('Inativo');
  });
  test('gera descrições distintas mesmo no mesmo milissegundo', () => {
    const valores = Array.from({ length: 100 }, () => buildMotivoAlteracao().descricao);
    expect(new Set(valores).size).toBe(100);
  });
  test('rejeita descrição vazia, sem prefixo ou acima de 100 caracteres', () => {
    for (const descricao of ['', 'AJUSTE', `QAAUTO ${'A'.repeat(94)}`]) {
      expect(() => buildMotivoAlteracao({ descricao })).toThrow();
    }
    expect(buildMotivoAlteracao({ descricao: `QAAUTO ${'A'.repeat(93)}` }).descricao.length).toBe(100);
  });
});
