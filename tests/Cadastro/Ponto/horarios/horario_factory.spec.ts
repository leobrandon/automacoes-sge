import { expect, test } from '@playwright/test';
import { buildHorario, isHorarioQAAuto } from '../../../../src/factories/horario.factory';
import { lerConfiguracaoCriacaoHorario, lerConfiguracaoExclusaoHorario } from './horario_config';

test('monta Horário com descrição QAAUTO sequenciada e padrões do SGE', () => {
  const horario = buildHorario({}, 1);
  expect(horario).toMatchObject({
    descricao: 'QAAUTO Horario 1',
    tipo: 'Mensal',
    colunaRefeicao: 'Saída 1 Entrada 2',
    horario24Horas: false,
    bancoDeHoras: false,
    exibirHoraDiurnaReduzida: false,
    jornada: {},
    horasExtras: {},
    colunas: {},
    sequencia: 1,
  });
  expect(buildHorario({ descricao: ' QAAUTO Base ' }, 3).descricao).toBe('QAAUTO Base 3');
});

test('trata valores vazios do JSON como não definidos', () => {
  const horario = buildHorario({
    jornada: { segunda: { entrada1: '', almocoLivre: '' as unknown as boolean } },
    horasExtras: { usarConfiguracaoDoHorario: '', percentuais: { diaUtil: '' as unknown as number } },
    colunas: { HT: { impressao: '' as unknown as boolean } },
  });
  expect(horario.jornada).toEqual({});
  expect(horario.horasExtras).toEqual({});
  expect(horario.colunas).toEqual({});
});

test('aplica os padrões das horas reduzidas e valida o limite de uma hora', () => {
  const horario = buildHorario({ exibirHoraDiurnaReduzida: true, exibirHoraNoturnaReduzida: true });
  expect(horario.horaDiurnaReduzida).toBe('00:50:00');
  expect(horario.horaNoturnaReduzida).toBe('00:52:30');
  expect(buildHorario({ exibirHoraDiurnaReduzida: true, horaDiurnaReduzida: '01:00:00' }).horaDiurnaReduzida).toBe('01:00:00');
  expect(() => buildHorario({ exibirHoraDiurnaReduzida: true, horaDiurnaReduzida: '01:00:01' })).toThrow(/no máximo 01:00:00/);
  expect(() => buildHorario({ exibirHoraDiurnaReduzida: true, horaDiurnaReduzida: '00:00:00' })).toThrow(/maior que 00:00:00/);
  expect(() => buildHorario({ horaNoturnaReduzida: '00:52:30' })).toThrow(/exibirHoraNoturnaReduzida/);
});

test('recusa combinações que o SGE ignora ou limpa', () => {
  expect(() => buildHorario({ tipo: 'Diária', cargaHorariaFixaEmHoras: '160' })).toThrow(/tipo Mensal/);
  expect(() => buildHorario({ horario24Horas: true, horarioFechamentoNoturno: '05:00' })).toThrow(/desabilitado/);
  expect(() => buildHorario({ cargaHorariaFixaEmHoras: '8h' })).toThrow(/apenas dígitos/);
  expect(() => buildHorario({ tipo: 'Diária', jornada: { segunda: { entrada1: '08:00' } } }))
    .toThrow(/tipo Diária.*campos ocultos: entrada1/);
  expect(buildHorario({ tipo: 'Diária', jornada: { segunda: { cargaHoraria: '08:00', almocoLivre: false } } })
    .jornada.segunda).toEqual({ cargaHoraria: '08:00' });
  expect(buildHorario({ tipo: 'Diária', jornada: { segunda: { cargaHoraria: '08:00', neutro: true } } })
    .jornada.segunda).toEqual({ cargaHoraria: '08:00', neutro: true });
  expect(() => buildHorario({
    horasExtras: { usarConfiguracaoDoHorario: 'Outro', percentuais: { diaUtil: 50 } },
  })).toThrow(/OU/);
});

test('valida descrição, sequência, tipo, coluna de refeição e valores de jornada/colunas', () => {
  expect(() => buildHorario({}, 0)).toThrow(/inteiro positivo/);
  expect(() => buildHorario({ descricao: 'Sem prefixo' })).toThrow(/QAAUTO/);
  expect(() => buildHorario({ descricao: `QAAUTO ${'X'.repeat(245)}` })).toThrow(/250 caracteres/);
  expect(() => buildHorario({ tipo: 'Semanal' })).toThrow(/Opções: Mensal, Diária/);
  expect(() => buildHorario({ colunaRefeicao: 'Saída 9 Entrada 10' })).toThrow(/Coluna Refeição/);
  expect(() => buildHorario({ jornada: { feriado: { entrada1: '08:00' } } as never })).toThrow(/Dia "feriado" inválido/);
  expect(() => buildHorario({ jornada: { segunda: { entrada1: '8h' } } })).toThrow(/HH:mm/);
  expect(() => buildHorario({ jornada: { segunda: { entrada1: '24:00' } } })).toThrow(/HH:mm/);
  expect(buildHorario({ jornada: { segunda: { cargaHoraria: '24:00' } } }).jornada.segunda?.cargaHoraria).toBe('24:00');
  expect(() => buildHorario({ jornada: { segunda: { cargaHoraria: '24:60' } } })).toThrow(/HH:mm/);
  expect(() => buildHorario({ jornada: { segunda: { entrada9: '08:00' } as never } })).toThrow(/desconhecidos/);
  expect(() => buildHorario({ horasExtras: { percentuais: { diaUtil: 0 } } })).toThrow(/entre 1 e 100/);
  expect(() => buildHorario({ horasExtras: { percentuais: { diaUtil: 101 } } })).toThrow(/entre 1 e 100/);
  expect(() => buildHorario({ horasExtras: { percentuais: { feriados: 50 } as never } })).toThrow(/inválido/);
  expect(() => buildHorario({ colunas: { XX: { impressao: true } } as never })).toThrow(/Coluna "XX" inválida/);
  expect(isHorarioQAAuto(' QAAUTO Horario 1 ')).toBe(true);
  expect(isHorarioQAAuto('Horário Professor')).toBe(false);
});

test('aceita uma configuração completa válida', () => {
  const horario = buildHorario({
    descricao: 'QAAUTO Horario Completo',
    tipo: 'Mensal',
    colunaRefeicao: 'Saída 2 Entrada 3',
    cargaHorariaFixaEmHoras: '160',
    horarioFechamentoNoturno: '05:00',
    bancoDeHoras: true,
    horaExtra: true,
    adicionalNoturno: true,
    jornada: {
      segunda: {
        entrada1: '08:00', saida1: '12:00', entrada2: '13:00', saida2: '17:00',
        toleranciaFalta: '00:10', toleranciaExtra: '00:15', cargaHoraria: '08:00', almocoLivre: true,
      },
    },
    horasExtras: { percentuais: { diaUtil: 50, sabado: 60, folga: 100 } },
    colunas: { HT: { preFolha: true }, CH: { impressao: false } },
  }, 2);
  expect(horario.descricao).toBe('QAAUTO Horario Completo 2');
  expect(horario.jornada.segunda?.almocoLivre).toBe(true);
  expect(horario.horasExtras.percentuais).toEqual({ diaUtil: 50, sabado: 60, folga: 100 });
  expect(horario.colunas).toEqual({ HT: { preFolha: true }, CH: { impressao: false } });
});

test('carrega e valida os JSONs de criação e exclusão', () => {
  const criacao = lerConfiguracaoCriacaoHorario();
  expect(criacao.quantidade).toBeGreaterThanOrEqual(1);
  expect(buildHorario(criacao.dados, 1).descricao).toMatch(/^QAAUTO\b/);

  const exclusao = lerConfiguracaoExclusaoHorario();
  expect(typeof exclusao.excluirTodasQAAUTO).toBe('boolean');
  expect(exclusao.termoGeral.toUpperCase()).toBe('QAAUTO');
});
