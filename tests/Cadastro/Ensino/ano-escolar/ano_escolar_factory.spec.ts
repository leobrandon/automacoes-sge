import { expect, test } from '@playwright/test';
import { buildAnoEscolar, isAnoEscolarQAAuto } from '../../../../src/factories/ano-escolar.factory';

test.describe('Factory de Ano Escolar', () => {
  test('gera dados válidos QAAUTO e nomes únicos por sequência', () => {
    const primeiro = buildAnoEscolar({}, 1);
    const segundo = buildAnoEscolar({}, 2);
    const terceiro = buildAnoEscolar({}, 3);

    expect(primeiro.nome).toBe('QAAUTO - 1º Ano 1');
    expect(segundo.nome).toBe('QAAUTO - 1º Ano 2');
    expect(terceiro.nome).toBe('QAAUTO - 1º Ano 3');
    expect(primeiro.nome).not.toBe(segundo.nome);
    expect(primeiro.codigoTurma).toMatch(/^\d{5}$/);
    expect(primeiro.composicaoEnsino).toBe('FUNDAMENTAL ANOS INICIAIS');
    expect(primeiro.etapaEnsino).toBe('Ensino fundamental de 9 anos - 1º ano [14]');
    expect(primeiro.ativo).toBe('Sim');
    expect(isAnoEscolarQAAuto(primeiro.nome)).toBe(true);
    expect(isAnoEscolarQAAuto('ANO ESCOLAR QAAUTO')).toBe(false);
  });

  test('deriva o nome padrão do Ano Escolar a partir da etapa configurada', () => {
    const anoSexto = buildAnoEscolar({ etapaEnsino: 'Ensino fundamental de 9 anos - 6º ano [19]' });

    expect(anoSexto.nome).toBe('QAAUTO - 6º Ano 1');
  });

  test('usa os valores configurados e mantém a sequência no nome QAAUTO', () => {
    const ano = buildAnoEscolar({
      nome: 'QAAUTO - Ano Escolar Configurado',
      codigoTurma: 'QA',
      codigoExterno: '123',
      composicaoEnsino: 'COMPOSIÇÃO NOVA INFANTIL',
      etapaEnsino: 'PRÉ',
      idadeMinima: '4',
      tipoIdade: 'Anos',
    }, 2);

    expect(ano.nome).toBe('QAAUTO - Ano Escolar Configurado 2');
    expect(ano.codigoTurma).toBe('QA');
    expect(ano.codigoExterno).toBe('123');
    expect(ano.composicaoEnsino).toBe('COMPOSIÇÃO NOVA INFANTIL');
    expect(ano.etapaEnsino).toBe('PRÉ');
    expect(ano.idadeMinima).toBe('4');
    expect(ano.tipoIdade).toBe('Anos');
  });

  test('rejeita identificadores que não sejam QAAUTO ou ultrapassem os limites da tela', () => {
    expect(() => buildAnoEscolar({ nome: 'Ano sem prefixo' })).toThrow(/QAAUTO/i);
    expect(buildAnoEscolar({ codigoTurma: 'ABCDE' }).codigoTurma).toBe('ABCDE');
    expect(() => buildAnoEscolar({ codigoTurma: 'ABCDEF' })).toThrow(/5 caracteres/);
    expect(() => buildAnoEscolar({ nome: `QAAUTO ${'A'.repeat(128)}` })).toThrow(/128 caracteres/);
  });
});
