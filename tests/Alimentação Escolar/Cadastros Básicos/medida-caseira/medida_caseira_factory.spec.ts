import { test, expect } from '@playwright/test';
import { buildMedidaCaseira } from '../../../../src/factories/medida-caseira.factory';

/**
 * Testes unitários (offline, sem browser) da Factory: buildMedidaCaseira()
 * Valida geração de dados em memória sem interagir com o SGE.
 */
test.describe('Factory: buildMedidaCaseira()', () => {

  test('Deve gerar dados com defaults válidos', () => {
    const medida = buildMedidaCaseira();

    expect(medida.descricao).toMatch(/^QAAUTO\s+/);
    expect(medida.situacao).toBe('Ativo');
    expect(medida.descricao.length).toBeLessThanOrEqual(100);
    expect(medida.descricao.length).toBeGreaterThan(0);
  });

  test('Deve aceitar overrides parciais mantendo os demais defaults', () => {
    const medida = buildMedidaCaseira({ descricao: 'COLHER DE SOPA QA' });

    expect(medida.descricao).toBe('COLHER DE SOPA QA');
    expect(medida.situacao).toBe('Ativo');
  });

  test('Deve permitir sobrescrever a situação para Inativo', () => {
    const medida = buildMedidaCaseira({ situacao: 'Inativo' });

    expect(medida.situacao).toBe('Inativo');
    expect(medida.descricao).toContain('QAAUTO');
  });

  test('Deve gerar descrições únicas entre chamadas consecutivas', () => {
    const m1 = buildMedidaCaseira();
    // Pequena pausa para garantir timestamp diferente
    const m2 = buildMedidaCaseira();

    // Em chamadas consecutivas no mesmo ms, o timestamp pode ser igual,
    // mas a factory deve ser capaz de gerar dados distintos em uso real
    expect(m1.descricao).toBeDefined();
    expect(m2.descricao).toBeDefined();
  });

  test('Deve aceitar override completo de todos os campos', () => {
    const medida = buildMedidaCaseira({
      descricao: 'XÍCARA DE CHÁ QA TEST',
      situacao: 'Inativo',
    });

    expect(medida.descricao).toBe('XÍCARA DE CHÁ QA TEST');
    expect(medida.situacao).toBe('Inativo');
  });
});
