const LIMITE_DESCRICAO = 200;

export const EIXOS_AREA_ATUACAO = [
  'Outro',
  'Averiguação de denúncia',
  'Pedagógico',
  'Gestão de Pessoas e clima educacional',
  'Administrativo e Financeiro',
  'Visão sistêmica e estratégica',
] as const;

export interface AreaAtuacaoData {
  eixo: string;
  /** Identificador QAAUTO da área: `QAAUTO <base> <sequência>` (o SGE recusa nome repetido no mesmo eixo). */
  descricao: string;
  sequencia: number;
}

/** `descricao` aqui é a base do identificador; a sequência é acrescentada pela factory. */
export type BuildAreaAtuacaoOptions = Partial<Omit<AreaAtuacaoData, 'sequencia'>>;

/** Obrigatórios da tela: Eixo e Descrição. Área ativa já vem marcada e subtipos são opcionais. */
export function buildAreaAtuacao(options: BuildAreaAtuacaoOptions = {}, sequencia = 1): AreaAtuacaoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Área de atuação deve ser um inteiro positivo.');
  }

  const eixo = options.eixo?.trim() || 'Outro';
  if (!(EIXOS_AREA_ATUACAO as readonly string[]).includes(eixo)) {
    throw new Error(`Eixo "${eixo}" inválido. Opções: ${EIXOS_AREA_ATUACAO.join(' | ')}.`);
  }

  const base = options.descricao?.trim() || 'QAAUTO Area de atuacao';
  if (!isAreaAtuacaoQAAuto(base)) {
    throw new Error('A descrição de Área de atuação deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Área de atuação deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  return { eixo, descricao, sequencia };
}

export function isAreaAtuacaoQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
