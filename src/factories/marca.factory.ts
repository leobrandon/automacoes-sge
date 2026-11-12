const LIMITE_DESCRICAO = 128;

export interface MarcaData {
  descricao: string;
  sequencia: number;
}

export type BuildMarcaOptions = Partial<Omit<MarcaData, 'sequencia'>>;

/** Descrição `QAAUTO <base> <sequência>`; o campo Descrição aceita até 128 caracteres. */
export function buildMarca(options: BuildMarcaOptions = {}, sequencia = 1): MarcaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Marca deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Marca';
  if (!isMarcaQAAuto(base)) {
    throw new Error('A descrição de Marca deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Marca deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  return { descricao, sequencia };
}

export function isMarcaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
