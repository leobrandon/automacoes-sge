/** O select "Dia de Início" oferece os dias de 1 a 29. */
export const DIAS_INICIO_PERIODO = Array.from({ length: 29 }, (_, indice) => indice + 1);

const LIMITE_DESCRICAO = 250;

export interface PeriodoData {
  descricao: string;
  diaInicio: number;
  sequencia: number;
}

export type BuildPeriodoOptions = Partial<Omit<PeriodoData, 'sequencia'>>;

/** Descrição `QAAUTO <base> <sequência>`; o Dia de Início padrão é 1. */
export function buildPeriodo(options: BuildPeriodoOptions = {}, sequencia = 1): PeriodoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Período deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Periodo';
  if (!isPeriodoQAAuto(base)) {
    throw new Error('A descrição de Período deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Período deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  const diaInicio = options.diaInicio ?? 1;
  if (!DIAS_INICIO_PERIODO.includes(diaInicio)) {
    throw new Error(`O Dia de Início deve ser um inteiro entre 1 e ${DIAS_INICIO_PERIODO.length}.`);
  }

  return { descricao, diaInicio, sequencia };
}

export function isPeriodoQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
