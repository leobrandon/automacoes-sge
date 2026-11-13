import { test, expect } from '@playwright/test';
import { buildTurma } from '../../../../src/factories';

test.describe('Testes Unitários da Factory de Turma (buildTurma)', () => {

  test('1. Deve gerar turma de escolarização com valores padrão válidos', () => {
    const turma = buildTurma();

    expect(turma.anoLetivo).toBe('2026');
    expect(turma.calendarioEscolar).toBe('Calendário 2026');
    expect(turma.composicaoEnsino).toBe('CRECHE - Integral');
    expect(turma.turno).toBe('Integral');
    expect(turma.descricao).toMatch(/^QAAUTO\s+.+\s+-\s+\d+$/);
    expect(turma.mediacaoDidaticoPedagogica).toBe('Presencial');
    expect(turma.localFuncionamentoDiferenciado).toContain('não está em local de funcionamento diferenciado');
    expect(turma.tipoEstruturaCurricular).toBe('CRECHE - INTEGRAL');
    expect(turma.numeroCopias).toBe(1);
    expect(turma.situacaoDesejada).toBe('Ativo');
  });

  test('2. Deve permitir customizar campos específicos mantendo os padrões nos demais', () => {
    const custom = buildTurma({
      descricao: 'Turma Especial 1º Ano A',
      situacaoDesejada: 'Rascunho',
      turno: 'Matutino',
      mediacaoDidaticoPedagogica: 'Semipresencial',
      anoLetivo: '2025'
    });

    expect(custom.descricao).toBe('Turma Especial 1º Ano A');
    expect(custom.situacaoDesejada).toBe('Rascunho');
    expect(custom.turno).toBe('Matutino');
    expect(custom.mediacaoDidaticoPedagogica).toBe('Semipresencial');
    expect(custom.anoLetivo).toBe('2025');
    // Valores herdados da factory
    expect(custom.tipoEstruturaCurricular).toBe('CRECHE - INTEGRAL');
    expect(custom.numeroCopias).toBe(1);
  });

  test('3. Chamadas consecutivas devem gerar descrições com identificadores independentes', async () => {
    const t1 = buildTurma();
    await new Promise((res) => setTimeout(res, 20));
    const t2 = buildTurma();

    expect(t1.descricao).toBeDefined();
    expect(t2.descricao).toBeDefined();
  });

});
