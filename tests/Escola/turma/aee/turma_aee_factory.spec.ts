import { expect, test } from '@playwright/test';
import { buildTurmaAee, type BuildTurmaAeeOptions } from '../../../../src/factories/turma-aee.factory';

const dadosBase: BuildTurmaAeeOptions = {
  diretoriaRegional: 'DRE BRANDAO',
  municipio: 'GOIÂNIA',
  unidadeEducacional: 'ESCOLA ESTADUAL DAS OLIVEIRAS',
  calendarioEscolar: 'Calendário Escolar 2026 - Ensino Fundamental',
  turno: 'Matutino/Manhã',
  diasDeAtendimento: ['Segunda'],
  atividadesAee: ['Desenvolvimento de funções cognitivas'],
  situacaoDesejada: 'Ativo' as const,
};

test.describe('Factory de Turma AEE', () => {
  test('gera descrição QAAUTO determinística e preserva os dados configurados', () => {
    const turma = buildTurmaAee({ ...dadosBase, descricao: 'QAAUTO Turma AEE Automacao' }, 3);
    expect(turma.descricao).toBe('QAAUTO Turma AEE Automacao 3');
    expect(turma.diasDeAtendimento).toEqual(['Segunda']);
    expect(turma.atividadesAee).toEqual(['Desenvolvimento de funções cognitivas']);
    expect(turma.situacaoDesejada).toBe('Ativo');
  });

  test('permite configurar rascunho e mais de um dia/atividade', () => {
    const turma = buildTurmaAee({
      ...dadosBase,
      situacaoDesejada: 'Rascunho',
      diasDeAtendimento: ['Segunda', 'Quarta'],
      atividadesAee: ['Desenvolvimento de funções cognitivas', 'Ensino de Sistema Braille'],
    });
    expect(turma.situacaoDesejada).toBe('Rascunho');
    expect(turma.diasDeAtendimento).toEqual(['Segunda', 'Quarta']);
    expect(turma.atividadesAee).toHaveLength(2);
  });

  test('rejeita sequência, prefixo, apoio ou lista de atendimento inválidos', () => {
    expect(() => buildTurmaAee(dadosBase, 0)).toThrow(/inteiro positivo/i);
    expect(() => buildTurmaAee({ ...dadosBase, descricao: 'Turma sem marcador' })).toThrow(/QAAUTO/i);
    expect(() => buildTurmaAee({ ...dadosBase, calendarioEscolar: '' })).toThrow(/calendarioEscolar/i);
    expect(() => buildTurmaAee({ ...dadosBase, diasDeAtendimento: [] })).toThrow(/ao menos um dia/i);
    expect(() => buildTurmaAee({ ...dadosBase, atividadesAee: [] })).toThrow(/ao menos uma atividade/i);
    expect(() => buildTurmaAee({
      ...dadosBase,
      atividadesAee: ['Atividade não cadastrada'],
    } as unknown as BuildTurmaAeeOptions)).toThrow(/inválida/i);
  });
});
