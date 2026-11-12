import { expect, test } from '@playwright/test';
import { buildCargo, isCargoQAAuto } from '../../../../src/factories/cargo.factory';
import { lerDadosCargo, validarUrlSandbox } from './cargo-test-config';

test('monta os dados do Cargo com descrição QAAUTO sequenciada e padrões observados', () => {
  const cargo = buildCargo({ descricao: ' QAAUTO Cargo Cadastro ', tipo: 'Administrativo' }, 7);

  expect(cargo).toEqual({
    descricao: 'QAAUTO Cargo Cadastro 7',
    tipo: 'Administrativo',
    somenteEfetivos: false,
    formacaoSuperior: false,
    atividadesEDeveres: '',
    sequencia: 7,
  });
});

test('recusa sequência inválida, descrição sem prefixo QAAUTO e tipo fora das opções do sistema', () => {
  expect(() => buildCargo({ descricao: 'QAAUTO Cargo', tipo: 'Administrativo' }, 0))
    .toThrow(/inteiro positivo/i);
  expect(() => buildCargo({ descricao: 'Cargo', tipo: 'Administrativo' }, 1))
    .toThrow(/QAAUTO/i);
  expect(() => buildCargo({ descricao: 'QAAUTO Cargo', tipo: 'Outro' }, 1))
    .toThrow(/Tipo do cargo/i);
  expect(isCargoQAAuto(' QAAUTO Cargo Cadastro 7 ')).toBe(true);
  expect(isCargoQAAuto('Cargo existente')).toBe(false);
});

test('recusa descrição acima do limite documentado de 100 caracteres', () => {
  expect(() => buildCargo({ descricao: `QAAUTO ${'X'.repeat(95)}`, tipo: 'Administrativo' }, 1))
    .toThrow(/100 caracteres/i);
});

test('carrega massas independentes e aceita somente o host de sandbox', () => {
  const cadastro = buildCargo(lerDadosCargo('dados_cargo.json'), 41);
  const exclusao = buildCargo(lerDadosCargo('dados_exclusao_cargo.json'), 42);

  expect(cadastro.descricao).toBe('QAAUTO Cargo Cadastro 41');
  expect(exclusao.descricao).toBe('QAAUTO Cargo Exclusão 42');
  expect(validarUrlSandbox('https://sandbox.pontoid.com.br/')).toBe('https://sandbox.pontoid.com.br/');
  expect(validarUrlSandbox('https://homologa-sge.pontoid.com.br')).toBe('https://homologa-sge.pontoid.com.br');
  expect(() => validarUrlSandbox('endereço inválido')).toThrow(/URL válida/i);
});
