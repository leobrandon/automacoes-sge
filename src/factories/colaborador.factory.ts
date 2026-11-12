import { gerarCpfValido } from '../helpers/cpf.helper';
import { fakeData } from '../helpers/generators/fake-data';

/**
 * Contrato de dados para cadastro de Colaborador / Servidor no SGE.
 * Campos mapeados diretamente da tela /colaborador.
 */
export interface ColaboradorData {
  nome: string;
  cpf: string;
  dataNascimento: string;
  sexo: 'Masculino' | 'Feminino';
  corRaca: 'Parda' | 'Branca' | 'Preta' | 'Amarela' | 'Indígena' | 'Não declarada';
  nacionalidade: 'Brasileira' | 'Brasileira - nascido no exterior ou naturalizado' | 'Estrangeira';
  pais: string;
  naturalidadeUf: string;
  naturalidadeCidade: string;
  estadoCivil?: 'Não Especificado' | 'Casado(a)' | 'Divorciado(a)' | 'Separado(a)' | 'Solteiro(a)' | 'Viúvo(a)';
  nomeMae?: string;
  nomePai?: string;
  enderecoCep: string;
  enderecoLogradouro?: string;
  enderecoBairro?: string;
  enderecoNumero?: string;
  enderecoUf: string;
  enderecoCidade: string;
  zonaResidencial: 'Urbana' | 'Rural';
  localizacaoDiferenciada: 'NaoEstaEmAreaDeLocalizacaoDiferenciada' | 'AreaDeQuilombos' | 'TerraIndigena' | 'AreaDeAssentamento' | 'AreaOndeLocalizamPovosComunidadesTradicionais';
  email: string;
  celular?: string;
}

export type BuildColaboradorOptions = Partial<ColaboradorData>;

/**
 * Factory para geração de dados fictícios e válidos de um Colaborador.
 * Gera dados em memória, com CPF válido (Módulo 11), sufixo [QA-AUTO] e faixa etária de adulto.
 */
export function buildColaborador(options: BuildColaboradorOptions = {}): ColaboradorData {
  const sexo = options.sexo ?? 'Masculino';
  const nomeBase = sexo === 'Feminino' 
    ? fakeData.gerarNomeFeminino() 
    : fakeData.gerarNomeMasculino();

  return {
    nome: options.nome ?? `${nomeBase} QAAUTO`,
    cpf: options.cpf ?? gerarCpfValido(),
    dataNascimento: options.dataNascimento ?? fakeData.gerarDataNascimento(21, 65),
    sexo,
    corRaca: options.corRaca ?? 'Parda',
    nacionalidade: options.nacionalidade ?? 'Brasileira',
    pais: options.pais ?? 'Brasil',
    naturalidadeUf: options.naturalidadeUf ?? 'GO',
    naturalidadeCidade: options.naturalidadeCidade ?? 'Goiânia',
    estadoCivil: options.estadoCivil ?? 'Solteiro(a)',
    nomeMae: options.nomeMae ?? fakeData.gerarNomeFeminino(),
    nomePai: options.nomePai ?? fakeData.gerarNomeMasculino(),
    enderecoCep: options.enderecoCep ?? fakeData.gerarCepGoiania(),
    enderecoLogradouro: options.enderecoLogradouro ?? 'Avenida Central',
    enderecoBairro: options.enderecoBairro ?? 'Setor Central',
    enderecoNumero: options.enderecoNumero ?? '100',
    enderecoUf: options.enderecoUf ?? 'GO',
    enderecoCidade: options.enderecoCidade ?? 'Goiânia',
    zonaResidencial: options.zonaResidencial ?? 'Urbana',
    localizacaoDiferenciada: options.localizacaoDiferenciada ?? 'NaoEstaEmAreaDeLocalizacaoDiferenciada',
    email: options.email ?? fakeData.gerarEmail(nomeBase),
    celular: options.celular ?? fakeData.gerarCelular('62'),
    ...options,
  };
}
