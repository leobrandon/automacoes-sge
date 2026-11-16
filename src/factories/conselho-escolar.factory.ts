import { gerarCpfValido } from '../helpers/cpf.helper';

export const PREFIXO_CONSELHO_ESCOLAR = 'QAAUTO';

export const TIPOS_MEMBRO_CONSELHO = ['Aluno', 'Colaborador', 'Comunidade', 'Responsável do Aluno'] as const;
export type TipoMembroConselho = (typeof TIPOS_MEMBRO_CONSELHO)[number];

export const TIPOS_ANEXO_CONSELHO = ['Ata de Posse', 'Complementar', 'Substitutiva', 'Outros'] as const;
export type TipoAnexoConselho = (typeof TIPOS_ANEXO_CONSELHO)[number];

export interface MembroConselhoConfig {
  tipo: TipoMembroConselho;
  /** Descrição da função cadastrada em Conselho Escolar > Função (sem o sufixo "(18 anos)"). */
  funcao: string;
  /** Pessoa listada (Aluno/Colaborador/Responsável). Vazio usa a primeira elegível da lista. */
  pessoa?: string;
}

export interface AnexoConselhoConfig {
  tipo: TipoAnexoConselho;
}

export interface VigenciaConselhoConfig {
  dataInicio: string;
  dataFim: string;
  membros: MembroConselhoConfig[];
  anexos: AnexoConselhoConfig[];
}

export interface PessoaComunidadeData {
  nome: string;
  cpf: string;
  cpfFormatado: string;
  dataNascimento: string;
  celular: string;
}

export interface MembroConselhoData extends MembroConselhoConfig {
  /** Presente somente para membros do tipo Comunidade (pessoa criada pela automação). */
  comunidade?: PessoaComunidadeData;
}

export interface AnexoConselhoData extends AnexoConselhoConfig {
  descricao: string;
  nomeArquivo: string;
}

export interface VigenciaConselhoData {
  dataInicio: string;
  dataFim: string;
  membros: MembroConselhoData[];
  anexos: AnexoConselhoData[];
}

/** Maior de 18 anos para respeitar a idade mínima usual das funções. */
const DATA_NASCIMENTO_COMUNIDADE = '01/01/1990';
const CELULAR_COMUNIDADE = '62999990001';

const ORDINAIS = ['Zero', 'Um', 'Dois', 'Tres', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove'];

/** O SGE descarta dígitos do nome da pessoa, então a sequência vai por extenso (a linha é achada pelo CPF). */
export function nomeMembroComunidade(sequencia: number): string {
  const ordinal = ORDINAIS[sequencia] ?? String(sequencia).replace(/\d/g, (d) => ORDINAIS[Number(d)]);
  return `${PREFIXO_CONSELHO_ESCOLAR} Membro Comunidade ${ordinal}`;
}

export function descricaoAnexoConselho(sequencia: number): string {
  return `${PREFIXO_CONSELHO_ESCOLAR} Anexo Conselho ${sequencia}`;
}

/** Nova pessoa de comunidade QAAUTO com CPF válido. */
export function buildPessoaComunidade(sequencia: number): PessoaComunidadeData {
  const cpf = gerarCpfValido(false);
  return {
    nome: nomeMembroComunidade(sequencia),
    cpf,
    cpfFormatado: cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
    dataNascimento: DATA_NASCIMENTO_COMUNIDADE,
    celular: CELULAR_COMUNIDADE,
  };
}

/** Numera os nomes QAAUTO (membros de comunidade e anexos) em sequência contínua. */
export function buildConselhoEscolar(vigencias: VigenciaConselhoConfig[]): VigenciaConselhoData[] {
  let membrosComunidade = 0;
  let anexos = 0;
  return vigencias.map((vigencia) => ({
    dataInicio: vigencia.dataInicio,
    dataFim: vigencia.dataFim,
    membros: vigencia.membros.map((membro) => {
      if (membro.tipo !== 'Comunidade') return { ...membro };
      membrosComunidade += 1;
      return { ...membro, comunidade: buildPessoaComunidade(membrosComunidade) };
    }),
    anexos: vigencia.anexos.map((anexo) => {
      anexos += 1;
      return { ...anexo, descricao: descricaoAnexoConselho(anexos), nomeArquivo: `qaauto-anexo-conselho-${anexos}.pdf` };
    }),
  }));
}

export function contemQAAuto(texto: string): boolean {
  return /\bQAAUTO\b/i.test(texto);
}

export function dataValidaConselho(texto: string): boolean {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!partes) return false;
  const [dia, mes, ano] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}
