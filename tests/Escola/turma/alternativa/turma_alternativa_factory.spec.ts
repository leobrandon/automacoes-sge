import { expect, test } from '@playwright/test';
import {
  buildTurmaAlternativa,
  type BuildTurmaAlternativaOptions,
} from '../../../../src/factories/turma-alternativa.factory';

const dadosBase: BuildTurmaAlternativaOptions = {
  diretoriaRegional: 'DRE BRANDAO',
  municipio: 'GOIÂNIA',
  anoLetivo: '2026',
  unidadeEducacional: 'ESCOLA MUNICIPAL CULTURA - 52315',
  calendarioEscolar: 'Calendário Escolar 2026 - Ensino Fundamental',
  composicaoEnsino: 'COMPOSIÇÃO DE ENSINO ANOS INICIAIS - Parcial',
  anoEscolar: '1º ANO',
  turno: 'Vespertino/Tarde',
};

test.describe('Factory de Turma Alternativa', () => {
  test('gera descrição QAAUTO determinística e aplica os padrões da tela', () => {
    const turma = buildTurmaAlternativa({ ...dadosBase, descricao: 'QAAUTO Turma Alternativa' }, 3);
    expect(turma.descricao).toBe('QAAUTO Turma Alternativa 3');
    expect(turma.anoLetivo).toBe('2026');
    expect(turma.mediacaoDidaticoPedagogica).toBe('Presencial');
    expect(turma.localFuncionamentoDiferenciado).toMatch(/não está em local de funcionamento diferenciado/i);
    expect(turma.situacaoDesejada).toBe('Ativo');
  });

  test('permite configurar rascunho e outra mediação', () => {
    const turma = buildTurmaAlternativa({
      ...dadosBase,
      situacaoDesejada: 'Rascunho',
      mediacaoDidaticoPedagogica: 'Semipresencial',
    });
    expect(turma.situacaoDesejada).toBe('Rascunho');
    expect(turma.mediacaoDidaticoPedagogica).toBe('Semipresencial');
  });

  test('rejeita sequência, prefixo, apoio ou opção inválidos', () => {
    expect(() => buildTurmaAlternativa(dadosBase, 0)).toThrow(/inteiro positivo/i);
    expect(() => buildTurmaAlternativa({ ...dadosBase, descricao: 'Turma sem marcador' })).toThrow(/QAAUTO/i);
    expect(() => buildTurmaAlternativa({ ...dadosBase, descricao: `QAAUTO ${'x'.repeat(80)}` })).toThrow(/80 caracteres/i);
    expect(() => buildTurmaAlternativa({ ...dadosBase, calendarioEscolar: '' })).toThrow(/calendarioEscolar/i);
    expect(() => buildTurmaAlternativa({ ...dadosBase, anoEscolar: '' })).toThrow(/anoEscolar/i);
    expect(() => buildTurmaAlternativa({
      ...dadosBase,
      mediacaoDidaticoPedagogica: 'Remota',
    } as unknown as BuildTurmaAlternativaOptions)).toThrow(/mediacaoDidaticoPedagogica/i);
  });
});
