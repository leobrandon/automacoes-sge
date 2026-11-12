const LIMITE_DESCRICAO = 100;

/** Tipo de dependência (Educacenso) usado quando o JSON não informa outro. */
export const TIPO_DEPENDENCIA_PADRAO = 'Almoxarifado';

export interface DependenciaFisicaData {
  descricao: string;
  tipoDependencia: string;
  sequencia: number;
}

export type BuildDependenciaFisicaOptions = Partial<Omit<DependenciaFisicaData, 'sequencia'>>;

/** Descrição `QAAUTO <base> <sequência>`; os obrigatórios são Descrição e Tipo de dependência. */
export function buildDependenciaFisica(
  options: BuildDependenciaFisicaOptions = {},
  sequencia = 1,
): DependenciaFisicaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Dependência Física deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Dependencia Fisica';
  if (!isDependenciaFisicaQAAuto(base)) {
    throw new Error('A descrição de Dependência Física deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Dependência Física deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  const tipoDependencia = options.tipoDependencia?.trim() || TIPO_DEPENDENCIA_PADRAO;
  return { descricao, tipoDependencia, sequencia };
}

export function isDependenciaFisicaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
