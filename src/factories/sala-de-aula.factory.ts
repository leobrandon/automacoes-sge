export const CLIMATIZACOES_SALA_DE_AULA = [
  'Ar-condicionado',
  'Aquecedor',
  'Climatizador',
  'Ventilador',
  'Não há',
] as const;
export type ClimatizacaoSalaDeAula = (typeof CLIMATIZACOES_SALA_DE_AULA)[number];

/** Valores da tenant de homologação; podem ser trocados em dados_sala_de_aula.json. */
export const ESCOLA_PADRAO_SALA_DE_AULA = 'ESCOLA MUNICIPAL CULTURA';
const BASE_DESCRICAO_PADRAO = 'QAAUTO Sala de Aula';
const LIMITE_DESCRICAO = 100;

export interface SalaDeAulaData {
  escola: string;
  descricao: string;
  climatizacao: ClimatizacaoSalaDeAula[];
  /** Campo opcional no SGE, mas preenchido sempre que Ar-condicionado estiver na climatização. */
  quantidadeAresCondicionados?: number;
  /** Opcionais: só são preenchidos quando informados. O número da sala é único por escola. */
  numeroSala?: number;
  capacidadeAlunos?: number;
  largura?: number;
  comprimento?: number;
  peDireito?: number;
  area?: number;
  volume?: number;
  larguraPorta?: number;
  numeroJanelas?: number;
  sequencia: number;
}

export type BuildSalaDeAulaOptions = Partial<Omit<SalaDeAulaData, 'sequencia'>>;

/** Descrição `QAAUTO <base> <sequência>`; os obrigatórios são Escola, Descrição e Climatização. */
export function buildSalaDeAula(options: BuildSalaDeAulaOptions = {}, sequencia = 1): SalaDeAulaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Sala de Aula deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || BASE_DESCRICAO_PADRAO;
  if (!isSalaDeAulaQAAuto(base)) {
    throw new Error('A descrição de Sala de Aula deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Sala de Aula deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  const climatizacao = options.climatizacao?.length ? [...new Set(options.climatizacao)] : ['Ar-condicionado' as const];
  if (climatizacao.includes('Não há') && climatizacao.length > 1) {
    throw new Error('A climatização "Não há" é exclusiva e não combina com as demais.');
  }

  const quantidadeAres = options.quantidadeAresCondicionados ?? 1;
  if (!Number.isSafeInteger(quantidadeAres) || quantidadeAres < 0) {
    throw new Error('A quantidade de ares-condicionados deve ser um inteiro não negativo.');
  }
  if (options.numeroSala !== undefined && (!Number.isSafeInteger(options.numeroSala) || options.numeroSala < 1
    || options.numeroSala > 999)) {
    throw new Error('O número da sala deve ser um inteiro entre 1 e 999.');
  }

  return {
    ...options,
    escola: options.escola?.trim() || ESCOLA_PADRAO_SALA_DE_AULA,
    descricao,
    climatizacao,
    quantidadeAresCondicionados: climatizacao.includes('Ar-condicionado') ? quantidadeAres : undefined,
    sequencia,
  };
}

export function isSalaDeAulaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
