import { test, expect } from '@playwright/test';
import { buildAluno, BuildAlunoOptions } from '../../../src/factories';
import { fakeData } from '../../../src/helpers/generators/fake-data';

/**
 * Função utilitária de teste para validar se um CPF é matematicamente válido (Módulo 11).
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

const contextoBaseAmbiente: BuildAlunoOptions = {
  escola: 'Escola Municipal Teste',
  serie: '1º Ano EF',
  turno: 'Matutino',
};

test.describe('Testes Isolados / Unitários da Factory de Aluno (buildAluno)', () => {

  test('1. Deve exigir e atribuir fielmente os dados obrigatórios de ambiente (escola, serie, turno)', () => {
    const options: BuildAlunoOptions = {
      escola: /ESCOLA MODELO/i,
      serie: /2º Ano/i,
      turno: /Vespertino/i,
    };

    const aluno = buildAluno(options);

    // Atribuição direta sem fallbacks
    expect(aluno.escola).toBe(options.escola);
    expect(aluno.serie).toBe(options.serie);
    expect(aluno.turno).toBe(options.turno);

    // Campos essenciais autogerados
    expect(typeof aluno.nome).toBe('string');
    expect(aluno.nome.trim().length).toBeGreaterThan(3);
    expect(aluno.nome).toMatch(/^.+\s\[QA-AUTO\]$/);
    expect(aluno.cpf).toBeDefined();
    expect(aluno.dataNascimento).toBeDefined();
    expect(aluno.sexo).toBe('Masculino');
    expect(aluno.nacionalidade).toBe('Brasileira');
    expect(aluno.corRaca).toBe('Parda');

    // Campos de filiação e responsável (responsável não possui o sufixo [QA-AUTO])
    expect(typeof aluno.responsavelNome).toBe('string');
    expect(aluno.responsavelNome!.trim().length).toBeGreaterThan(3);
    expect(aluno.responsavelNome).not.toContain('[QA-AUTO]');
    expect(aluno.responsavelCpf).toBeDefined();
    expect(aluno.responsavelCelular).toMatch(/^\(\d{2}\)\s9\d{4}-\d{4}$/);
    expect(aluno.responsavelParentesco).toBe('Mãe');
    expect(aluno.responsavelSexo).toBe('Feminino');
  });

  test('2. O CPF gerado deve ser matematicamente válido segundo o algoritmo oficial', () => {
    const aluno = buildAluno(contextoBaseAmbiente);
    expect(aluno.cpf).toBeDefined();
    expect(validarCpf(aluno.cpf!)).toBe(true);

    if (aluno.responsavelCpf) {
      expect(validarCpf(aluno.responsavelCpf)).toBe(true);
    }
  });

  test('3. As datas geradas devem respeitar o formato estrito DD/MM/AAAA', () => {
    const aluno = buildAluno(contextoBaseAmbiente);
    const regexData = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;

    expect(aluno.dataNascimento).toMatch(regexData);
    if (aluno.responsavelDataNascimento) {
      expect(aluno.responsavelDataNascimento).toMatch(regexData);
    }
  });

  test('4. Duas chamadas consecutivas devem gerar dados aleatórios únicos e independentes com sufixo [QA-AUTO]', () => {
    const aluno1 = buildAluno(contextoBaseAmbiente);
    const aluno2 = buildAluno(contextoBaseAmbiente);

    expect(aluno1.nome).not.toBe(aluno2.nome);
    expect(aluno1.nome).toMatch(/^.+\s\[QA-AUTO\]$/);
    expect(aluno2.nome).toMatch(/^.+\s\[QA-AUTO\]$/);
    expect(aluno1.cpf).not.toBe(aluno2.cpf);
  });

  test('5. Deve permitir overrides pontuais mantendo os demais dados autogerados e o contexto de ambiente', () => {
    const customNome = 'Maria Eduarda Fernandes';
    const customCpf = '12345678909';
    const customDataNasc = '05/11/2016';
    const customEscola = 'Escola Municipal Monteiro Lobato';
    const customSerie = '3º Ano';
    const customTurno = 'Integral';

    const aluno = buildAluno({
      escola: customEscola,
      serie: customSerie,
      turno: customTurno,
      nome: customNome,
      cpf: customCpf,
      dataNascimento: customDataNasc,
      sexo: 'Feminino',
      beneficiarioBolsaFamilia: true,
    });

    // Valores explícitos de ambiente e overrides (o nome explícito NÃO deve receber o sufixo [QA-AUTO])
    expect(aluno.escola).toBe(customEscola);
    expect(aluno.serie).toBe(customSerie);
    expect(aluno.turno).toBe(customTurno);
    expect(aluno.nome).toBe(customNome);
    expect(aluno.nome.endsWith('[QA-AUTO]')).toBe(false);
    expect(aluno.cpf).toBe(customCpf);
    expect(aluno.dataNascimento).toBe(customDataNasc);
    expect(aluno.sexo).toBe('Feminino');
    expect(aluno.beneficiarioBolsaFamilia).toBe(true);

    // Valores padrão que continuam sendo autogerados
    expect(aluno.nacionalidade).toBe('Brasileira');
    expect(aluno.responsavelNome).toBeDefined();
    expect(aluno.enderecoCep).toBe('74000-000');
  });

  test('6. Deve adaptar o gênero do responsável conforme responsavelSexo no override', () => {
    const alunoComPai = buildAluno({
      ...contextoBaseAmbiente,
      responsavelSexo: 'Masculino',
    });

    expect(alunoComPai.responsavelSexo).toBe('Masculino');
    expect(alunoComPai.responsavelParentesco).toBe('Pai');
    expect(typeof alunoComPai.responsavelNome).toBe('string');
  });

  test('7. Deve suportar a definição de semente (seed) no fakeData para geração determinística', () => {
    fakeData.setSeed(42);
    const nome1 = fakeData.gerarNome();

    fakeData.setSeed(42);
    const nome2 = fakeData.gerarNome();

    expect(nome1).toBe(nome2);
  });

  test('8. Nomes gerados automaticamente devem terminar com " [QA-AUTO]" e conter nome/sobrenome válidos do Faker', () => {
    // Aluno masculino
    const alunoMasc = buildAluno({
      ...contextoBaseAmbiente,
      sexo: 'Masculino',
    });
    expect(alunoMasc.nome.endsWith(' [QA-AUTO]')).toBe(true);
    const nomeBaseMasc = alunoMasc.nome.replace(' [QA-AUTO]', '');
    const partesMasc = nomeBaseMasc.split(' ');
    expect(partesMasc.length).toBeGreaterThanOrEqual(2);
    expect(nomeBaseMasc.length).toBeGreaterThan(3);

    // Aluno feminino
    const alunoFem = buildAluno({
      ...contextoBaseAmbiente,
      sexo: 'Feminino',
    });
    expect(alunoFem.nome.endsWith(' [QA-AUTO]')).toBe(true);
    const nomeBaseFem = alunoFem.nome.replace(' [QA-AUTO]', '');
    const partesFem = nomeBaseFem.split(' ');
    expect(partesFem.length).toBeGreaterThanOrEqual(2);
    expect(nomeBaseFem.length).toBeGreaterThan(3);
  });

  test('9. Deve gerar data de nascimento correspondente à idade exata solicitada', () => {
    const aluno = buildAluno({
      ...contextoBaseAmbiente,
      idade: 14,
    });

    const anoAtual = new Date().getFullYear();
    const anoNascimento = parseInt(aluno.dataNascimento.split('/')[2], 10);
    const diferencaAnos = anoAtual - anoNascimento;

    expect(diferencaAnos).toBeGreaterThanOrEqual(14);
    expect(diferencaAnos).toBeLessThanOrEqual(15);
  });

  test('10. Deve gerar data de nascimento dentro da faixa etária (idadeMin e idadeMax)', () => {
    const aluno = buildAluno({
      ...contextoBaseAmbiente,
      idadeMin: 13,
      idadeMax: 15,
    });

    const anoAtual = new Date().getFullYear();
    const anoNascimento = parseInt(aluno.dataNascimento.split('/')[2], 10);
    const diferencaAnos = anoAtual - anoNascimento;

    expect(diferencaAnos).toBeGreaterThanOrEqual(13);
    expect(diferencaAnos).toBeLessThanOrEqual(16);
  });

  test('11. Deve inferir faixa etária contextualmente a partir do nome da série escolar', () => {
    const alunoBebe = buildAluno({
      ...contextoBaseAmbiente,
      serie: 'EDUCAÇÃO INFANTIL - 06 MESES A 11 MESES - A',
    });
    const anoAtual = new Date().getFullYear();
    const anoNascBebe = parseInt(alunoBebe.dataNascimento.split('/')[2], 10);
    expect(anoAtual - anoNascBebe).toBeLessThanOrEqual(1);

    const alunoNonoAno = buildAluno({
      ...contextoBaseAmbiente,
      serie: '9º ANO - ENSINO FUNDAMENTAL',
    });
    const anoNascNono = parseInt(alunoNonoAno.dataNascimento.split('/')[2], 10);
    expect(anoAtual - anoNascNono).toBeGreaterThanOrEqual(14);
    expect(anoAtual - anoNascNono).toBeLessThanOrEqual(16);
  });

});
