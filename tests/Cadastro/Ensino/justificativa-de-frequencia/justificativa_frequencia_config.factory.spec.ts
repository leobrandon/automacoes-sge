import { expect, test } from '@playwright/test';
import {
  combinarFalhasCiclo,
  lerConfiguracaoCriacaoJustificativaFrequencia,
  lerConfiguracaoExclusaoJustificativaFrequencia,
  validarEscopoExclusao,
  validarUrlSandbox,
} from './justificativa_frequencia_config';

test('lê a configuração que cria duas justificativas com Abono Sim e Não', () => {
  expect(lerConfiguracaoCriacaoJustificativaFrequencia()).toEqual({
    quantidade: 2,
    dados: {
      descricao: 'QAAUTO Justificativa de Frequência',
      abonoPorSequencia: ['Sim', 'Não'],
      ativa: 'Sim',
    },
  });
});

test('lê a configuração de exclusão restrita às descrições explícitas do JSON', () => {
  expect(lerConfiguracaoExclusaoJustificativaFrequencia()).toEqual({
    excluirSomenteDescricoesConfiguradas: true,
    quantidadeEsperada: 2,
    descricoes: [
      'QAAUTO Justificativa de Frequência 1',
      'QAAUTO Justificativa de Frequência 2',
    ],
  });
});

test('aceita o SANDBOX e rejeita qualquer outro host antes do login', () => {
  expect(validarUrlSandbox('https://sandbox.pontoid.com.br')).toBe('https://sandbox.pontoid.com.br');
  expect(validarUrlSandbox('https://homologa-sge.pontoid.com.br')).toBe('https://homologa-sge.pontoid.com.br');
});

test('aceita a lista exata, QAAUTO e sem duplicidade para exclusão', () => {
  const config = lerConfiguracaoExclusaoJustificativaFrequencia();
  expect(() => validarEscopoExclusao(config, [
    'QAAUTO Justificativa de Frequência 1',
    'QAAUTO Justificativa de Frequência 2',
  ])).not.toThrow();
});

test('recusa exclusão desabilitada, quantidade divergente, descrição não QAAUTO e duplicidade', () => {
  const config = lerConfiguracaoExclusaoJustificativaFrequencia();
  expect(() => validarEscopoExclusao({ ...config, excluirSomenteDescricoesConfiguradas: false }, [
    'QAAUTO Justificativa 1', 'QAAUTO Justificativa 2',
  ])).toThrow();
  expect(() => validarEscopoExclusao(config, ['QAAUTO Justificativa 1'])).toThrow(/quantidade/i);
  expect(() => validarEscopoExclusao(config, ['Justificativa 1', 'QAAUTO Justificativa 2']))
    .toThrow(/QAAUTO/i);
  expect(() => validarEscopoExclusao(config, ['QAAUTO Justificativa 1', 'QAAUTO Justificativa 1']))
    .toThrow(/duplicad/i);
});

test('preserva a falha original e inclui falhas de limpeza quando ambas ocorrem', () => {
  const original = new Error('Falha de criação');
  const erroLimpeza = new Error('Falha de exclusão');

  expect(combinarFalhasCiclo(original, [])).toBe(original);
  expect(combinarFalhasCiclo(undefined, [])).toBeUndefined();
  const combinado = combinarFalhasCiclo(original, [erroLimpeza]);
  expect(combinado).toBeInstanceOf(AggregateError);
  expect((combinado as AggregateError).errors).toEqual([original, erroLimpeza]);
});
