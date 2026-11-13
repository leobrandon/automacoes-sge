const LIMITE_CLASSIFICACAO = 200;
const LIMITE_DESCRICAO = 1000;
/** O campo aceita até 6 caracteres mascarados ("999,99"). */
const PONTUACAO_MAXIMA_CAMPO = 999;
/** Degrau entre faixas de sequências vizinhas: deixa folga para o SGE não acusar faixa sobreposta. */
const DEGRAU_FAIXA = 20;
const LARGURA_FAIXA = 10;

export interface MetricaAcompanhamentoData {
  /** Identificador QAAUTO da métrica: `QAAUTO <base> <sequência>` (o SGE aceita nome repetido). */
  classificacao: string;
  /** Inteiro. A faixa é a chave única do SGE: ele recusa "Faixa de métrica sobreposta". */
  pontuacaoMinima: number;
  pontuacaoMaxima: number;
  /** Vazio = mantém a cor padrão do formulário. Formato `#rrggbb`. */
  cor: string;
  /** Opcional: só é preenchida quando informada. */
  descricao: string;
  sequencia: number;
}

/** `classificacao` aqui é a base do identificador; a sequência é acrescentada pela factory. */
export type BuildMetricaAcompanhamentoOptions = Partial<
  Omit<MetricaAcompanhamentoData, 'sequencia'>
>;

function inteiroNaoNegativo(valor: number, rotulo: string): number {
  if (!Number.isSafeInteger(valor) || valor < 0 || valor > PONTUACAO_MAXIMA_CAMPO) {
    throw new Error(`${rotulo} deve ser um inteiro entre 0 e ${PONTUACAO_MAXIMA_CAMPO}.`);
  }
  return valor;
}

/**
 * Obrigatórios da tela: Pontuação mínima/máxima, Classificação e Cor (já vem preenchida).
 * Sem faixa informada, a faixa nasce da sequência (0–10, 20–30, 40–50...) para não sobrepor outras.
 */
export function buildMetricaAcompanhamento(
  options: BuildMetricaAcompanhamentoOptions = {},
  sequencia = 1,
): MetricaAcompanhamentoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Métrica deve ser um inteiro positivo.');
  }

  const base = options.classificacao?.trim() || 'QAAUTO Metrica';
  if (!isMetricaAcompanhamentoQAAuto(base)) {
    throw new Error('A classificação de Métrica deve começar com QAAUTO.');
  }
  const classificacao = `${base} ${sequencia}`;
  if (classificacao.length > LIMITE_CLASSIFICACAO) {
    throw new Error(`A classificação de Métrica deve ter até ${LIMITE_CLASSIFICACAO} caracteres.`);
  }

  const minimaPadrao = (sequencia - 1) * DEGRAU_FAIXA;
  const pontuacaoMinima = inteiroNaoNegativo(options.pontuacaoMinima ?? minimaPadrao, 'A pontuação mínima');
  const pontuacaoMaxima = inteiroNaoNegativo(
    options.pontuacaoMaxima ?? pontuacaoMinima + LARGURA_FAIXA,
    'A pontuação máxima',
  );
  if (pontuacaoMaxima < pontuacaoMinima) {
    throw new Error('A pontuação máxima deve ser maior ou igual à mínima.');
  }

  const cor = options.cor?.trim().toLowerCase() || '';
  if (cor && !/^#[0-9a-f]{6}$/.test(cor)) {
    throw new Error('A cor da Métrica deve estar no formato #rrggbb.');
  }
  const descricao = options.descricao?.trim() || '';
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição da Métrica deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  return { classificacao, pontuacaoMinima, pontuacaoMaxima, cor, descricao, sequencia };
}

/** Texto da coluna "Faixa de pontuação" da grade. */
export function rotuloFaixaMetrica(minima: number, maxima: number): string {
  return `${minima} a ${maxima}`;
}

export function isMetricaAcompanhamentoQAAuto(classificacao: string): boolean {
  return /^QAAUTO\b/i.test(classificacao.trim());
}
