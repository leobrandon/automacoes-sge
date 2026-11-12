import { fakeData } from '../helpers/generators/fake-data';

export interface CategoriaDaTurmaData {
  descricao: string;
}

export type BuildCategoriaDaTurmaOptions = Partial<CategoriaDaTurmaData>;

/** Nomes temáticos usados quando a descrição não é informada no JSON. */
export const EXEMPLOS_CATEGORIA_DA_TURMA = [
  'QAAUTO - Turma Regular',
  'QAAUTO - Turma Integral',
  'QAAUTO - Turma Multisseriada',
  'QAAUTO - Turma Bilíngue',
  'QAAUTO - Educação Infantil',
  'QAAUTO - Ensino Fundamental',
  'QAAUTO - Ensino Médio',
  'QAAUTO - Educação de Jovens e Adultos',
  'QAAUTO - Atendimento Educacional Especializado',
  'QAAUTO - Atividade Complementar',
] as const;

/** Usa a descrição informada ou escolhe uma categoria temática aleatória. */
export function obterDescricaoBaseCategoriaDaTurma(descricao?: string): string {
  const descricaoBase = descricao?.trim()
    || fakeData.faker.helpers.arrayElement(EXEMPLOS_CATEGORIA_DA_TURMA);

  if (!descricaoBase.startsWith('QAAUTO - ') || descricaoBase.length <= 'QAAUTO - '.length) {
    throw new Error('A descrição da Categoria da Turma deve começar com "QAAUTO - ".');
  }

  return descricaoBase;
}

/** Monta a descrição com o sufixo sequencial solicitado para o lote. */
export function buildCategoriaDaTurma(
  options: BuildCategoriaDaTurmaOptions = {},
  sequencia = 1,
): CategoriaDaTurmaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência da Categoria da Turma deve ser um inteiro positivo.');
  }

  const descricaoBase = obterDescricaoBaseCategoriaDaTurma(options.descricao);
  return { descricao: `${descricaoBase} ${sequencia}` };
}

/** Restringe a exclusão automatizada a descrições QAAUTO numeradas. */
export function isDescricaoCategoriaDaTurmaQAAuto(descricao: string): boolean {
  return /^QAAUTO - .+ [1-9]\d*$/.test(descricao.trim());
}
