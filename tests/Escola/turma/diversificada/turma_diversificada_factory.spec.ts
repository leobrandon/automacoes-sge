import { expect, test } from '@playwright/test';
import {
  buildTurmaDiversificada,
  type BuildTurmaDiversificadaOptions,
} from '../../../../src/factories/turma-diversificada.factory';

const dadosBase: BuildTurmaDiversificadaOptions = {
  diretoriaRegional: 'DRE BRANDAO',
  municipio: 'GOIÂNIA',
  unidadeEducacional: 'ESCOLA MUNICIPAL CULTURA - 52315',
  calendarioEscolar: 'Calendário Escolar 2026 - Ensino Fundamental',
  composicaoEnsino: 'COMPOSIÇÃO DE ENSINO ANOS INICIAIS - Parcial',
  anoEscolar: '1º ANO',
  turno: 'Vespertino/Tarde',
};

test.describe('Factory de Turma Diversificada', () => {
  test('gera descrição QAAUTO determinística e aplica os padrões da tela', () => {
    const turma = buildTurmaDiversificada({ ...dadosBase, descricao: 'QAAUTO Turma Diversificada' }, 3);
    expect(turma.descricao).toBe('QAAUTO Turma Diversificada 3');
    expect(turma.anoLetivo).toBe('2026');
    expect(turma.mediacaoDidaticoPedagogica).toBe('Presencial');
    expect(turma.localFuncionamentoDiferenciado).toMatch(/não está em local de funcionamento diferenciado/i);
    expect(turma.situacaoDesejada).toBe('Ativo');
  });

  test('permite configurar rascunho e outra mediação', () => {
    const turma = buildTurmaDiversificada({
      ...dadosBase,
      situacaoDesejada: 'Rascunho',
      mediacaoDidaticoPedagogica: 'Semipresencial',
    });
    expect(turma.situacaoDesejada).toBe('Rascunho');
    expect(turma.mediacaoDidaticoPedagogica).toBe('Semipresencial');
  });

  test('rejeita sequência, prefixo, apoio ou opção inválidos', () => {
    expect(() => buildTurmaDiversificada(dadosBase, 0)).toThrow(/inteiro positivo/i);
    expect(() => buildTurmaDiversificada({ ...dadosBase, descricao: 'Turma sem marcador' })).toThrow(/QAAUTO/i);
    expect(() => buildTurmaDiversificada({ ...dadosBase, calendarioEscolar: '' })).toThrow(/calendarioEscolar/i);
    expect(() => buildTurmaDiversificada({ ...dadosBase, anoEscolar: '' })).toThrow(/anoEscolar/i);
    expect(() => buildTurmaDiversificada({
      ...dadosBase,
      mediacaoDidaticoPedagogica: 'Remota',
    } as unknown as BuildTurmaDiversificadaOptions)).toThrow(/mediacaoDidaticoPedagogica/i);
  });
});
