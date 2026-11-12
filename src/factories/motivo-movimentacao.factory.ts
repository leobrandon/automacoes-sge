const LIMITE_DESCRICAO = 100;

export interface MotivoMovimentacaoData {
  descricao: string;
  ativo: boolean;
  sequencia: number;
}

export type BuildMotivoMovimentacaoOptions = Partial<Omit<MotivoMovimentacaoData, 'sequencia'>>;

/** Descrição `QAAUTO <base> <sequência>`; o campo aceita até 100 caracteres e o motivo nasce Ativo. */
export function buildMotivoMovimentacao(
  options: BuildMotivoMovimentacaoOptions = {},
  sequencia = 1,
): MotivoMovimentacaoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Motivo de Movimentação deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Motivo Movimentacao';
  if (!isMotivoMovimentacaoQAAuto(base)) {
    throw new Error('A descrição de Motivo de Movimentação deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Motivo de Movimentação deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  return { descricao, ativo: options.ativo ?? true, sequencia };
}

export function isMotivoMovimentacaoQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
