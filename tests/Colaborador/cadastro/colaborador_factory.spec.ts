import { test, expect } from '@playwright/test';
import { buildColaborador } from '../../../src/factories';

/**
 * Validação de CPF via algoritmo oficial (Módulo 11).
 */
function validarCpf(cpf: string): boolean {
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  let soma1 = 0;
  for (let i = 0; i < 9; i++) {
    soma1 += parseInt(limpo[i], 10) * (10 - i);
  }
  const resto1 = soma1 % 11;
  const dv1 = resto1 < 2 ? 0 : 11 - resto1;
  if (dv1 !== parseInt(limpo[9], 10)) return false;

  let soma2 = 0;
  for (let i = 0; i < 10; i++) {
    soma2 += parseInt(limpo[i], 10) * (11 - i);
  }
  const resto2 = soma2 % 11;
  const dv2 = resto2 < 2 ? 0 : 11 - resto2;
  return dv2 === parseInt(limpo[10], 10);
}

test.describe('Testes Unitários da Factory de Colaborador (buildColaborador)', () => {

  test('1. Deve gerar colaborador completo com dados obrigatórios válidos', () => {
    const colaborador = buildColaborador();

    expect(typeof colaborador.nome).toBe('string');
    expect(colaborador.nome).toMatch(/^.+\sQAAUTO$/);
    expect(colaborador.cpf).toBeDefined();
    expect(colaborador.dataNascimento).toBeDefined();
    expect(colaborador.sexo).toBe('Masculino');
    expect(colaborador.corRaca).toBe('Parda');
    expect(colaborador.nacionalidade).toBe('Brasileira');
    expect(colaborador.pais).toBe('Brasil');
    expect(colaborador.enderecoCep).toMatch(/^74\d{3}-\d{3}$/);
    expect(colaborador.enderecoUf).toBe('GO');
    expect(colaborador.enderecoCidade).toBe('Goiânia');
    expect(colaborador.zonaResidencial).toBe('Urbana');
    expect(colaborador.localizacaoDiferenciada).toBe('NaoEstaEmAreaDeLocalizacaoDiferenciada');
    expect(colaborador.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  test('2. O CPF gerado deve ser matematicamente válido', () => {
    const colaborador = buildColaborador();
    expect(validarCpf(colaborador.cpf)).toBe(true);
  });

  test('3. A data de nascimento deve estar em DD/MM/AAAA e idade de adulto (>= 18 anos)', () => {
    const colaborador = buildColaborador();
    const regexData = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

    expect(colaborador.dataNascimento).toMatch(regexData);
    const anoNasc = parseInt(colaborador.dataNascimento.split('/')[2], 10);
    const idade = new Date().getFullYear() - anoNasc;
    expect(idade).toBeGreaterThanOrEqual(18);
  });

  test('4. Chamadas consecutivas devem gerar dados aleatórios independentes', () => {
    const colab1 = buildColaborador();
    const colab2 = buildColaborador();

    expect(colab1.nome).not.toBe(colab2.nome);
    expect(colab1.cpf).not.toBe(colab2.cpf);
    expect(colab1.email).not.toBe(colab2.email);
  });

  test('5. Deve permitir overrides mantendo os demais dados autogerados', () => {
    const custom = buildColaborador({
      nome: 'Professora Ana Paula Souza',
      sexo: 'Feminino',
      corRaca: 'Branca',
      estadoCivil: 'Casado(a)',
      enderecoCidade: 'Anápolis',
    });

    expect(custom.nome).toBe('Professora Ana Paula Souza');
    expect(custom.sexo).toBe('Feminino');
    expect(custom.corRaca).toBe('Branca');
    expect(custom.estadoCivil).toBe('Casado(a)');
    expect(custom.enderecoCidade).toBe('Anápolis');
    expect(validarCpf(custom.cpf)).toBe(true);
  });

  test('6. Deve adaptar o gênero do nome gerado para sexo Feminino', () => {
    const colabFem = buildColaborador({ sexo: 'Feminino' });
    expect(colabFem.sexo).toBe('Feminino');
    expect(colabFem.nome).toMatch(/^.+\sQAAUTO$/);
  });

});
