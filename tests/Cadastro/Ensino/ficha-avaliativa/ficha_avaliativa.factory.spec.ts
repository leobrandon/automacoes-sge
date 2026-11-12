import { expect, test } from '@playwright/test';
import { buildFichaAvaliativa } from '../../../../src/factories/ficha-avaliativa.factory';

test('gera nomes QAAUTO sequenciais e valores padrão que formam uma ficha completa', () => {
  expect(buildFichaAvaliativa({}, 1)).toEqual({
    descricao: 'QAAUTO Ficha Avaliativa 1',
    tituloParaImpressao: '',
    formaAvaliacao: 'Conceito',
    periodicidade: 'Não Utiliza',
    assinatura: 'Padrão do Sistema',
    informacaoComplementar: 'QAAUTO Informações Complementares 1',
    agrupador: 'QAAUTO Agrupador 1',
    topico: 'QAAUTO Tópico 1',
    desempenhoFinal: 'QAAUTO Desempenho Final 1',
  });
});

test('mantém as descrições configuradas e acrescenta somente a sequência', () => {
  expect(buildFichaAvaliativa({
    descricao: 'QAAUTO Ficha Maternal',
    agrupador: 'QAAUTO Desenvolvimento Integral',
    topico: 'QAAUTO Interage com os colegas',
    desempenhoFinal: 'QAAUTO Em desenvolvimento',
  }, 3)).toMatchObject({
    descricao: 'QAAUTO Ficha Maternal 3',
    agrupador: 'QAAUTO Desenvolvimento Integral 3',
    topico: 'QAAUTO Interage com os colegas 3',
    desempenhoFinal: 'QAAUTO Em desenvolvimento 3',
  });
});

test('rejeita descrições que não começam com QAAUTO', () => {
  expect(() => buildFichaAvaliativa({ descricao: 'Ficha de Matemática' })).toThrow(/QAAUTO/);
});
