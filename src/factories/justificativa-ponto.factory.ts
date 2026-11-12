export const TIPOS_JUSTIFICATIVA_PONTO = ['Não remunerada', 'Remunerada', 'Abono'] as const;
export const OPCOES_SIM_NAO_JUSTIFICATIVA_PONTO = ['Sim', 'Não'] as const;

export type TipoJustificativaPonto = typeof TIPOS_JUSTIFICATIVA_PONTO[number];
export type OpcaoSimNaoJustificativaPonto = typeof OPCOES_SIM_NAO_JUSTIFICATIVA_PONTO[number];

const LIMITE_DESCRICAO = 250;
const LIMITE_SIGLA = 5;
const LIMITE_CODIGO = 60;
const LIMITE_PRAZO = 4;

export interface JustificativaPontoData {
  descricao: string;
  sigla: string;
  /** Opcional; quando informado o SGE exige unicidade, por isso recebe a sequência como sufixo. */
  codigo: string;
  /** Prazo em dias (somente dígitos, até 4); vazio = sem prazo. */
  prazo: string;
  tipo: TipoJustificativaPonto;
  disponivelParaUnidades: OpcaoSimNaoJustificativaPonto;
  disponivelNaPreFolha: OpcaoSimNaoJustificativaPonto;
  sequencia: number;
}

export type BuildJustificativaPontoOptions = Partial<Omit<JustificativaPontoData, 'sequencia'>>;

/**
 * Descrição `QAAUTO <base> <sequência>`; a sigla padrão `QA<sequência>` cabe nos 5 caracteres do campo
 * (sequências até 999). O SGE não valida unicidade de descrição nem de sigla.
 */
export function buildJustificativaPonto(
  options: BuildJustificativaPontoOptions = {},
  sequencia = 1,
): JustificativaPontoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Justificativa de Ponto deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Justificativa Ponto';
  if (!isJustificativaPontoQAAuto(base)) {
    throw new Error('A descrição de Justificativa de Ponto deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Justificativa de Ponto deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  const sigla = options.sigla?.trim() || `QA${sequencia}`;
  if (sigla.length > LIMITE_SIGLA) {
    throw new Error(
      `A sigla "${sigla}" excede ${LIMITE_SIGLA} caracteres. `
      + 'Informe uma sigla curta em dados_justificativa_ponto.json ou use sequências até 999.',
    );
  }

  const codigoBase = options.codigo?.trim() || '';
  const codigo = codigoBase ? `${codigoBase}-${sequencia}` : '';
  if (codigo.length > LIMITE_CODIGO) {
    throw new Error(`O código de Justificativa de Ponto deve ter até ${LIMITE_CODIGO} caracteres.`);
  }

  const prazo = String(options.prazo ?? '').trim();
  if (prazo && !new RegExp(`^\\d{1,${LIMITE_PRAZO}}$`).test(prazo)) {
    throw new Error(`O prazo deve conter apenas dígitos (até ${LIMITE_PRAZO}).`);
  }

  return {
    descricao,
    sigla,
    codigo,
    prazo,
    tipo: options.tipo || 'Não remunerada',
    disponivelParaUnidades: options.disponivelParaUnidades || 'Sim',
    disponivelNaPreFolha: options.disponivelNaPreFolha || 'Não',
    sequencia,
  };
}

export function isJustificativaPontoQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
