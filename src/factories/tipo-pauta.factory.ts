import { EIXOS_AREA_ATUACAO } from './area-atuacao.factory';

const LIMITE_NOME = 200;
const LIMITE_DESCRICAO = 5000;
/** O campo aceita até 6 caracteres mascarados ("999,99"). */
const PONTUACAO_MAXIMA_CAMPO = 999;
const LIMITE_AGRUPADORES = 10;
const LIMITE_ITENS_POR_AGRUPADOR = 20;

export const EIXOS_TIPO_PAUTA = EIXOS_AREA_ATUACAO;

/** Valor do checkbox `TiposDeUnidadeAplicaveis` de cada destino permitido. */
export const DESTINOS_TIPO_PAUTA = {
  'Secretaria de Educação': 0,
  'Diretoria Regional': 1,
  'Unidade Escolar': 2,
} as const;

export const PERIODICIDADES_TIPO_PAUTA = [
  'Anual',
  'Semanal',
  'Bimestral',
  'Trimestral',
  'Semestral',
  'Mensal',
  'Quinzenal',
] as const;

export interface TipoPautaData {
  /** Chave de conferência QAAUTO: `QAAUTO <base> <sequência>` (o SGE recusa nome repetido na mesma área). */
  nome: string;
  eixo: string;
  /** Vazio = primeira área de atuação cadastrada no tenant (dado de apoio, não é criado pela automação). */
  areaAtuacao: string;
  /** Opcional: só é preenchida quando informada. */
  descricao: string;
  /** Inteiro > 0: o SGE recusa pauta sem pontuação total. */
  pontuacaoMaxima: number;
  /** Destino permitido (obrigatório no SGE): um dos rótulos de `DESTINOS_TIPO_PAUTA`. */
  destino: string;
  /** Vazio = primeiro calendário escolar do tenant (dado de apoio, não é criado pela automação). */
  calendario: string;
  periodicidade: string;
  /** Toggle "Registrar data da pauta": o acompanhamento passa a pedir a data (hoje por padrão). */
  registraDataDaPauta: boolean;
  /** Toggle "Permite cadastro retroativo": só existe quando a pauta registra data. */
  permiteCadastroRetroativo: boolean;
  /** Agrupadores `QAAUTO Agrupador <n>`; 0 = pauta sem estrutura (só a pauta). */
  quantidadeAgrupadores: number;
  /** Itens Sim/Não por agrupador, numerados em sequência na pauta (`QAAUTO Item <n>`). */
  itensPorAgrupador: number;
  sequencia: number;
}

/** `nome` aqui é a base do identificador; a sequência é acrescentada pela factory. */
export type BuildTipoPautaOptions = Partial<Omit<TipoPautaData, 'sequencia'>>;

/**
 * Obrigatórios da tela: Nome, Eixo, Área de atuação, Modo/Pontuação máxima, Auxiliares, "Informar 100%",
 * Calendário-base, Periodicidade e ao menos um destino. Modo, Auxiliares e "Informar 100%" mantêm o padrão do SGE.
 */
export function buildTipoPauta(options: BuildTipoPautaOptions = {}, sequencia = 1): TipoPautaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Tipo de pauta deve ser um inteiro positivo.');
  }

  const base = options.nome?.trim() || 'QAAUTO Pauta';
  if (!isTipoPautaQAAuto(base)) {
    throw new Error('O nome do Tipo de pauta deve começar com QAAUTO.');
  }
  const nome = `${base} ${sequencia}`;
  if (nome.length > LIMITE_NOME) {
    throw new Error(`O nome do Tipo de pauta deve ter até ${LIMITE_NOME} caracteres.`);
  }

  const eixo = options.eixo?.trim() || 'Outro';
  if (!(EIXOS_TIPO_PAUTA as readonly string[]).includes(eixo)) {
    throw new Error(`Eixo "${eixo}" inválido. Opções: ${EIXOS_TIPO_PAUTA.join(' | ')}.`);
  }

  const pontuacaoMaxima = options.pontuacaoMaxima ?? 100;
  if (!Number.isSafeInteger(pontuacaoMaxima) || pontuacaoMaxima < 1 || pontuacaoMaxima > PONTUACAO_MAXIMA_CAMPO) {
    throw new Error(`A pontuação máxima deve ser um inteiro entre 1 e ${PONTUACAO_MAXIMA_CAMPO}.`);
  }

  const destino = options.destino?.trim() || 'Unidade Escolar';
  if (!Object.keys(DESTINOS_TIPO_PAUTA).includes(destino)) {
    throw new Error(`Destino "${destino}" inválido. Opções: ${Object.keys(DESTINOS_TIPO_PAUTA).join(' | ')}.`);
  }

  const periodicidade = options.periodicidade?.trim() || 'Anual';
  if (!(PERIODICIDADES_TIPO_PAUTA as readonly string[]).includes(periodicidade)) {
    throw new Error(`Periodicidade "${periodicidade}" inválida. Opções: ${PERIODICIDADES_TIPO_PAUTA.join(' | ')}.`);
  }

  const descricao = options.descricao?.trim() || '';
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição do Tipo de pauta deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  const registraDataDaPauta = options.registraDataDaPauta ?? false;
  const permiteCadastroRetroativo = options.permiteCadastroRetroativo ?? false;
  if (permiteCadastroRetroativo && !registraDataDaPauta) {
    throw new Error('"Permite cadastro retroativo" só existe quando "Registrar data da pauta" está ligado.');
  }

  const quantidadeAgrupadores = options.quantidadeAgrupadores ?? 0;
  const itensPorAgrupador = options.itensPorAgrupador ?? 1;
  if (!Number.isSafeInteger(quantidadeAgrupadores) || quantidadeAgrupadores < 0 || quantidadeAgrupadores > LIMITE_AGRUPADORES) {
    throw new Error(`A quantidade de agrupadores deve ser um inteiro entre 0 e ${LIMITE_AGRUPADORES}.`);
  }
  if (!Number.isSafeInteger(itensPorAgrupador) || itensPorAgrupador < 1 || itensPorAgrupador > LIMITE_ITENS_POR_AGRUPADOR) {
    throw new Error(`Os itens por agrupador devem ser um inteiro entre 1 e ${LIMITE_ITENS_POR_AGRUPADOR}.`);
  }

  return {
    nome,
    eixo,
    areaAtuacao: options.areaAtuacao?.trim() || '',
    descricao,
    pontuacaoMaxima,
    destino,
    calendario: options.calendario?.trim() || '',
    periodicidade,
    registraDataDaPauta,
    permiteCadastroRetroativo,
    quantidadeAgrupadores,
    itensPorAgrupador,
    sequencia,
  };
}

export function nomeAgrupadorTipoPauta(indice: number): string {
  return `QAAUTO Agrupador ${indice}`;
}

export function tituloItemTipoPauta(numero: number): string {
  return `QAAUTO Item ${numero}`;
}

export function isTipoPautaQAAuto(nome: string): boolean {
  return /^QAAUTO\b/i.test(nome.trim());
}
