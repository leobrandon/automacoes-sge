/** Valores da tenant de homologação; podem ser trocados em dados_dependencia_fisica_da_escola.json. */
export const ESCOLA_PADRAO_DEPENDENCIA_FISICA_DA_ESCOLA = 'ESCOLA MUNICIPAL CULTURA';
export const TIPO_CONSTRUCAO_PADRAO = 'Alvenaria';
export const CONDICAO_USO_PADRAO = 'Adequado';
const BASE_DEPENDENCIA_PADRAO = 'QAAUTO Dependencia Fisica';

export interface DependenciaFisicaDaEscolaData {
  escola: string;
  /** Descrição da Dependência Física já cadastrada: `<base QAAUTO> <sequência>`. */
  dependenciaFisica: string;
  tipoConstrucao: string;
  condicaoUso: string;
  quantidadeDependencia: number;
  sequencia: number;
}

/**
 * `dependenciaFisica` é a base QAAUTO; a sequência é anexada porque o SGE recusa a mesma dependência
 * duas vezes na mesma escola ("Já existe um cadastro dessa mesma dependência para esta escola.").
 */
export type BuildDependenciaFisicaDaEscolaOptions = Partial<
  Omit<DependenciaFisicaDaEscolaData, 'sequencia'>
>;

export function buildDependenciaFisicaDaEscola(
  options: BuildDependenciaFisicaDaEscolaOptions = {},
  sequencia = 1,
): DependenciaFisicaDaEscolaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Dependência Física da Escola deve ser um inteiro positivo.');
  }

  const base = options.dependenciaFisica?.trim() || BASE_DEPENDENCIA_PADRAO;
  if (!isDependenciaFisicaDaEscolaQAAuto(base)) {
    throw new Error('A Dependência Física usada na automação deve começar com QAAUTO.');
  }

  const quantidadeDependencia = options.quantidadeDependencia ?? 1;
  if (!Number.isSafeInteger(quantidadeDependencia) || quantidadeDependencia < 1) {
    throw new Error('A Quantidade deve ser um inteiro positivo.');
  }

  return {
    escola: options.escola?.trim() || ESCOLA_PADRAO_DEPENDENCIA_FISICA_DA_ESCOLA,
    dependenciaFisica: `${base} ${sequencia}`,
    tipoConstrucao: options.tipoConstrucao?.trim() || TIPO_CONSTRUCAO_PADRAO,
    condicaoUso: options.condicaoUso?.trim() || CONDICAO_USO_PADRAO,
    quantidadeDependencia,
    sequencia,
  };
}

export function isDependenciaFisicaDaEscolaQAAuto(dependenciaFisica: string): boolean {
  return /^QAAUTO\b/i.test(dependenciaFisica.trim());
}
