import { AlunoData } from '../actions/criar-aluno.action';
import { gerarCpfValido } from '../helpers/cpf.helper';
import { fakeData } from '../helpers/generators/fake-data';

/**
 * Opções de entrada para a Factory de Aluno.
 * Exige estritamente os campos que dependem do ambiente/tenant do SGE (escola, serie, turno),
 * permitindo sobrescrever opcionalmente qualquer outro campo autogerado.
 */
export type BuildAlunoOptions =
  Pick<AlunoData, 'escola' | 'serie' | 'turno'> &
  Partial<Omit<AlunoData, 'escola' | 'serie' | 'turno'>> & {
    /** Idade exata desejada para o estudante em anos (ex: 14) */
    idade?: number | string;
    /** Idade mínima da faixa etária em anos (ex: 13) */
    idadeMin?: number | string;
    /** Idade máxima da faixa etária em anos (ex: 15) */
    idadeMax?: number | string;
  };

/**
 * Resolve a data de nascimento do estudante com base na precedência:
 * 1. dataNascimento explícita (DD/MM/AAAA)
 * 2. idade exata (ex: 14)
 * 3. idadeMin e/ou idadeMax (ex: 13 e 15)
 * 4. Inferência contextual pela série escolar (Educação Infantil, Anos Iniciais/Finais)
 * 5. Padrão escolar: 7 a 14 anos
 */
function resolverDataNascimento(options: BuildAlunoOptions): string {
  if (options.dataNascimento) {
    return options.dataNascimento;
  }

  // Idade exata informada
  if (options.idade !== undefined && options.idade !== null && options.idade !== '') {
    const idadeNum = Number(options.idade);
    if (!isNaN(idadeNum)) {
      return fakeData.gerarDataNascimento(idadeNum, idadeNum);
    }
  }

  // Faixa etária explícita informada (idadeMin e/ou idadeMax)
  const hasMin = options.idadeMin !== undefined && options.idadeMin !== null && options.idadeMin !== '' && !isNaN(Number(options.idadeMin));
  const hasMax = options.idadeMax !== undefined && options.idadeMax !== null && options.idadeMax !== '' && !isNaN(Number(options.idadeMax));

  if (hasMin || hasMax) {
    const min = hasMin ? Number(options.idadeMin) : (hasMax ? Math.max(0, Number(options.idadeMax) - 2) : 6);
    const max = hasMax ? Number(options.idadeMax) : (hasMin ? Number(options.idadeMin) + 2 : 17);
    return fakeData.gerarDataNascimento(min, max);
  }

  // Inferência contextual automática pelo nome da Série/Agrupamento
  const serieTexto = typeof options.serie === 'string'
    ? options.serie.toUpperCase()
    : (options.serie instanceof RegExp ? options.serie.source.toUpperCase() : '');

  if (serieTexto.includes('MESES') || serieTexto.includes('BERÇÁRIO') || serieTexto.includes('BERCARIO')) {
    return fakeData.gerarDataNascimento(0, 1);
  }
  if (serieTexto.includes('MATERNAL') || serieTexto.includes('CRECHE')) {
    return fakeData.gerarDataNascimento(1, 3);
  }
  if (serieTexto.includes('PRÉ') || serieTexto.includes('PRE') || serieTexto.includes('JARDIM')) {
    return fakeData.gerarDataNascimento(4, 5);
  }
  if (serieTexto.includes('1º ANO') || serieTexto.includes('1 ANO') || serieTexto.includes('1° ANO')) {
    return fakeData.gerarDataNascimento(7, 7);
  }
  if (serieTexto.includes('2º ANO') || serieTexto.includes('2 ANO') || serieTexto.includes('2° ANO')) {
    return fakeData.gerarDataNascimento(8, 8);
  }
  if (serieTexto.includes('3º ANO') || serieTexto.includes('3 ANO') || serieTexto.includes('3° ANO')) {
    return fakeData.gerarDataNascimento(9, 9);
  }
  if (serieTexto.includes('4º ANO') || serieTexto.includes('4 ANO') || serieTexto.includes('4° ANO')) {
    return fakeData.gerarDataNascimento(10, 10);
  }
  if (serieTexto.includes('5º ANO') || serieTexto.includes('5 ANO') || serieTexto.includes('5° ANO')) {
    return fakeData.gerarDataNascimento(11, 11);
  }
  if (serieTexto.includes('6º ANO') || serieTexto.includes('6 ANO') || serieTexto.includes('6° ANO')) {
    return fakeData.gerarDataNascimento(12, 12);
  }
  if (serieTexto.includes('7º ANO') || serieTexto.includes('7 ANO') || serieTexto.includes('7° ANO')) {
    return fakeData.gerarDataNascimento(13, 13);
  }
  if (serieTexto.includes('8º ANO') || serieTexto.includes('8 ANO') || serieTexto.includes('8° ANO')) {
    return fakeData.gerarDataNascimento(14, 14);
  }
  if (serieTexto.includes('9º ANO') || serieTexto.includes('9 ANO') || serieTexto.includes('9° ANO')) {
    return fakeData.gerarDataNascimento(15, 15);
  }
  if (serieTexto.includes('MÉDIO') || serieTexto.includes('MEDIO')) {
    return fakeData.gerarDataNascimento(15, 17);
  }

  // Padrão do Ensino Fundamental
  return fakeData.gerarDataNascimento(7, 14);
}

/**
 * Factory para geração de dados fictícios, realistas e válidos de um estudante (AlunoData).
 *
 * Gera dados de forma 100% offline e determinística/aleatória em memória.
 * Os campos dependentes de ambiente (escola, serie, turno) devem ser obrigatoriamente fornecidos pelo chamador.
 *
 * @param options Contexto obrigatório de ambiente e eventuais overrides.
 * @returns Objeto AlunoData completo e pronto para consumo em testes e Actions.
 */
export function buildAluno(options: BuildAlunoOptions): AlunoData {
  // 1. Determinação de Sexo do Aluno e geração contextual do Nome com identificador [QA-AUTO]
  const sexo = options.sexo ?? 'Masculino';
  const nomeBase = (sexo === 'Feminino' || sexo === '1')
    ? fakeData.gerarNomeFeminino()
    : fakeData.gerarNomeMasculino();
  const nomeAluno = options.nome ?? `${nomeBase} [QA-AUTO]`;

  // 2. Determinação de Sexo e Parentesco do Responsável
  const respSexo = options.responsavelSexo ?? 'Feminino';
  const respParentesco = options.responsavelParentesco ?? (respSexo === 'Feminino' ? 'Mãe' : 'Pai');
  const respNome = options.responsavelNome ?? (
    respSexo === 'Feminino'
      ? fakeData.gerarNomeFeminino()
      : fakeData.gerarNomeMasculino()
  );

  // 3. Resolução da Data de Nascimento (Precedência: explícita > idade > faixa > série > default)
  const dataNasc = resolverDataNascimento(options);

  // 4. Montagem do objeto com atribuição direta dos campos de ambiente (sem fallbacks fictícios)
  const alunoPadrao: AlunoData = {
    // Vínculo Escolar Obrigatório (Fornecido obrigatoriamente pelo contexto do teste/ambiente)
    escola: options.escola,
    serie: options.serie,
    turno: options.turno,

    // Identificação do Estudante (Autogerados com suporte a override)
    nome: nomeAluno,
    cpf: options.cpf ?? gerarCpfValido(),
    dataNascimento: dataNasc,
    sexo,
    corRaca: options.corRaca ?? 'Parda',
    nacionalidade: options.nacionalidade ?? 'Brasileira',

    // Parâmetros de Matrícula
    utilizaTransporteEscolar: options.utilizaTransporteEscolar ?? false,
    beneficiarioBolsaFamilia: options.beneficiarioBolsaFamilia ?? false,
    finalidadeMatricula: options.finalidadeMatricula ?? 'Escolarizacao',
    recebeEscolarizacaoOutroEspaco: options.recebeEscolarizacaoOutroEspaco ?? 'Não recebe escolarização fora da escola',

    // Naturalidade
    naturalidadeUf: options.naturalidadeUf ?? 'GO',
    naturalidadeCidade: options.naturalidadeCidade ?? 'Goiânia',

    // Endereço Residencial
    enderecoCep: options.enderecoCep ?? '74000-000',
    enderecoUf: options.enderecoUf ?? 'GO',
    enderecoCidade: options.enderecoCidade ?? 'Goiânia',
    zonaResidencial: options.zonaResidencial ?? 'Urbana',

    // Filiação / Responsável Legal
    responsavelNome: respNome,
    responsavelCpf: options.responsavelCpf ?? gerarCpfValido(),
    responsavelCelular: options.responsavelCelular ?? fakeData.gerarCelular('62'),
    responsavelDataNascimento: options.responsavelDataNascimento ?? fakeData.gerarDataNascimentoResponsavel(30, 52),
    responsavelSexo: respSexo,
    responsavelParentesco: respParentesco,
  };

  // Se houver propriedades opcionais adicionais passadas explicitamente (ex: matricula, dataCadastro)
  if (options.matricula !== undefined) {
    alunoPadrao.matricula = options.matricula;
  }
  if (options.dataCadastro !== undefined) {
    alunoPadrao.dataCadastro = options.dataCadastro;
  }
  if (options.turma !== undefined) {
    alunoPadrao.turma = options.turma;
  }
  if (options.dataEntradaTurma !== undefined) {
    alunoPadrao.dataEntradaTurma = options.dataEntradaTurma;
  }

  return alunoPadrao;
}
