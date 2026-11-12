import { gerarCnpjValido } from '../helpers/cnpj.helper';
import { gerarCpfValido } from '../helpers/cpf.helper';

export interface FornecedorOpcionaisData {
  caf: string;
  site: string;
}

export interface FornecedorPessoaFisicaData extends FornecedorOpcionaisData {
  nome: string;
  cpf: string;
  sequencia: number;
}

export interface FornecedorPessoaJuridicaData extends FornecedorOpcionaisData {
  razaoSocial: string;
  cnpj: string;
  nomeFantasia: string;
  inscricaoEstadual: string;
  sequencia: number;
}

export interface BuildFornecedorPessoaFisicaOptions {
  nome?: string;
  cpf?: string;
  caf?: string;
  site?: string;
}

export interface BuildFornecedorPessoaJuridicaOptions {
  razaoSocial?: string;
  cnpj?: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  caf?: string;
  site?: string;
}

function validarSequencia(sequencia: number): void {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência do Fornecedor deve ser um inteiro positivo.');
  }
}

function nomeQAAuto(base: string | undefined, padrao: string, sequencia: number, rotulo: string): string {
  const prefixo = base?.trim() || padrao;
  if (!/^QAAUTO\b/i.test(prefixo)) {
    throw new Error(`${rotulo} do Fornecedor deve começar com "QAAUTO".`);
  }
  const valor = `${prefixo} ${sequencia}`;
  if (valor.length > 128) {
    throw new Error(`${rotulo} do Fornecedor deve ter no máximo 128 caracteres.`);
  }
  return valor;
}

function opcional(valor: string | undefined, maximo: number, rotulo: string): string {
  const texto = valor?.trim() ?? '';
  if (texto.length > maximo) {
    throw new Error(`${rotulo} deve ter no máximo ${maximo} caracteres.`);
  }
  return texto;
}

/** CPF/CNPJ vazio gera um número válido aleatório, evitando o aviso de fornecedor duplicado do SGE. */
export function buildFornecedorPessoaFisica(
  options: BuildFornecedorPessoaFisicaOptions = {},
  sequencia = 1,
): FornecedorPessoaFisicaData {
  validarSequencia(sequencia);
  return {
    nome: nomeQAAuto(options.nome, 'QAAUTO Fornecedor Pessoa Física', sequencia, 'O nome'),
    cpf: options.cpf?.trim() || gerarCpfValido(),
    caf: opcional(options.caf, 25, 'O CAF'),
    site: opcional(options.site, 128, 'O site'),
    sequencia,
  };
}

export function buildFornecedorPessoaJuridica(
  options: BuildFornecedorPessoaJuridicaOptions = {},
  sequencia = 1,
): FornecedorPessoaJuridicaData {
  validarSequencia(sequencia);
  return {
    razaoSocial: nomeQAAuto(options.razaoSocial, 'QAAUTO Fornecedor Pessoa Jurídica', sequencia, 'A razão social'),
    cnpj: options.cnpj?.trim() || gerarCnpjValido(),
    nomeFantasia: nomeQAAuto(options.nomeFantasia, 'QAAUTO Fantasia Jurídica', sequencia, 'O nome fantasia'),
    inscricaoEstadual: opcional(options.inscricaoEstadual, 14, 'A inscrição estadual'),
    caf: opcional(options.caf, 25, 'O CAF'),
    site: opcional(options.site, 128, 'O site'),
    sequencia,
  };
}

export function isFornecedorQAAuto(nome: string): boolean {
  return /^QAAUTO\b/i.test(nome.trim());
}
