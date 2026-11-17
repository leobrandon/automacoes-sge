import { expect, test } from '@playwright/test';
import {
  buildCalendarioEscolar,
  type CalendarioEscolarOpcoes,
} from '../../../src/factories/calendario-escolar.factory';

const datas = {
  InicioPrimeiroBimestre: '01/02/2026',
  FimPrimeiroBimestre: '30/04/2026',
  LimiteRegistroConteudoPrimeiroBimestre: '30/04/2026',
  InicioSegundoBimestre: '01/05/2026',
  FimSegundoBimestre: '30/06/2026',
  LimiteRegistroConteudoSegundoBimestre: '30/06/2026',
  InicioTerceiroBimestre: '01/07/2026',
  FimTerceiroBimestre: '30/09/2026',
  LimiteRegistroConteudoTerceiroBimestre: '30/09/2026',
  InicioQuartoBimestre: '01/10/2026',
  FimQuartoBimestre: '20/12/2026',
  LimiteRegistroConteudoQuartoBimestre: '20/12/2026',
  FimPrimeiroSemestre: '30/06/2026',
  FimSegundoSemestre: '20/12/2026',
};

const composicoes: CalendarioEscolarOpcoes['composicoes'] = [
  {
    composicao: 'COMPOSIÇÃO DE ENSINO ANOS INICIAIS',
    tipoAtendimento: 'Parcial',
    periodicidade: 'Anual',
    materiaEscolar: 'Componente Curricular',
    origemCargaHoraria: 'Turma',
  },
  {
    composicao: 'COMPOSIÇÃO DE ENSINO ANOS INICIAIS',
    tipoAtendimento: 'Integral',
    periodicidade: 'Anual',
    materiaEscolar: 'Componente Curricular',
    origemCargaHoraria: 'Turma',
  },
  {
    composicao: 'COMPOSIÇÃO DE ENSINO ANOS FINAIS',
    tipoAtendimento: 'Parcial',
    periodicidade: 'Anual',
    materiaEscolar: 'Componente Curricular',
    origemCargaHoraria: 'Turma',
  },
];

const dados: CalendarioEscolarOpcoes = {
  descricao: '',
  anoLetivo: '2026',
  datas,
  composicoes,
};

test('gera descrição com prefixo e sequência', () => {
  expect(buildCalendarioEscolar(dados, 2).descricao).toBe('QAAUTO Calendário Escolar 2');
});

test('preserva as composições configuradas', () => {
  expect(buildCalendarioEscolar(dados).composicoes).toEqual(composicoes);
});

test('exige ao menos 3 composições e rejeita descrição sem prefixo', () => {
  expect(() =>
    buildCalendarioEscolar({ ...dados, composicoes: composicoes.slice(0, 2) }),
  ).toThrow('3 Composições');
  expect(() => buildCalendarioEscolar({ ...dados, descricao: 'Calendário' })).toThrow('QAAUTO');
});

test('rejeita composição repetida com o mesmo Tipo de Atendimento', () => {
  expect(() =>
    buildCalendarioEscolar({
      ...dados,
      composicoes: [composicoes[0], composicoes[0], composicoes[2]],
    }),
  ).toThrow('duplicidade');
});

test('rejeita Tipo de Atendimento fora das opções do SGE', () => {
  expect(() =>
    buildCalendarioEscolar({
      ...dados,
      composicoes: [
        { ...composicoes[0], tipoAtendimento: 'Noturno' as never },
        composicoes[1],
        composicoes[2],
      ],
    }),
  ).toThrow('Tipo de Atendimento');
});
