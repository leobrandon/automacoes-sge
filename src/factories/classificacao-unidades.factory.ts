const LIMITE_DESCRICAO = 100;

export interface ClassificacaoUnidadesData {
  descricao: string;
  sequencia: number;
}

export type BuildClassificacaoUnidadesOptions = Partial<Omit<ClassificacaoUnidadesData, 'sequencia'>>;

/** Descrição `QAAUTO <base> <sequência>`; o campo aceita até 100 caracteres. */
export function buildClassificacaoUnidades(
  options: BuildClassificacaoUnidadesOptions = {},
  sequencia = 1,
): ClassificacaoUnidadesData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Classificação de Unidades deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Classificacao';
  if (!isClassificacaoUnidadesQAAuto(base)) {
    throw new Error('A descrição de Classificação de Unidades deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Classificação de Unidades deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  return { descricao, sequencia };
}

export function isClassificacaoUnidadesQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
