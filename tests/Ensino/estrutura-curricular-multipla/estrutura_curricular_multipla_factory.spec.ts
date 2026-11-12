import { expect, test } from '@playwright/test';
import {
  buildEstruturaCurricular,
  type EstruturaCurricularDados,
} from '../../../src/factories/estrutura-curricular-multipla.factory';

const dados: EstruturaCurricularDados = {
  descricao: '',
  nivel: 'Educação Fundamental',
  tipo: 'Estrutura ABC',
  dataResolucao: '01/01/2026',
  numeroResolucao: '1',
  grades: [
    {
      anoEscolar: '1º ANO',
      componente: 'Matemática',
      cargaHoraria: '40',
      aulasSemanais: '2',
      aulasPresenciais: '1',
      aulasNaoPresenciais: '1',
    },
  ],
};

test('gera descrição com prefixo e sequência', () => {
  expect(buildEstruturaCurricular(dados, 2).descricao).toBe(
    'QAAUTO Estrutura Curricular Múltipla 2',
  );
});

test('exige ao menos uma grade e rejeita descrição sem prefixo', () => {
  expect(() => buildEstruturaCurricular({ ...dados, grades: [] })).toThrow();
  expect(() => buildEstruturaCurricular({ ...dados, descricao: 'Estrutura' })).toThrow('QAAUTO');
});

test('rejeita soma de aulas diferente da quantidade semanal', () => {
  expect(() =>
    buildEstruturaCurricular({ ...dados, grades: [{ ...dados.grades[0], aulasSemanais: '3' }] }),
  ).toThrow('soma');
});
