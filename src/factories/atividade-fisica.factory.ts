export const OPCOES_ATIVO_ATIVIDADE_FISICA = ['Sim', 'Não'] as const;

export type OpcaoAtivoAtividadeFisica = typeof OPCOES_ATIVO_ATIVIDADE_FISICA[number];

export interface AtividadeFisicaData {
  descricao: string;
  ativo: OpcaoAtivoAtividadeFisica;
}

export type BuildAtividadeFisicaOptions = Partial<AtividadeFisicaData>;

/** Base da descrição (sem sequência); o SGE recusa descrições repetidas. */
export function baseDescricaoAtividadeFisica(options: BuildAtividadeFisicaOptions = {}): string {
  const base = options.descricao?.trim() || 'QAAUTO Atividade Fisica';
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição de Atividade Física deve começar com QAAUTO.');
  }
  return base;
}

export function buildAtividadeFisica(
  options: BuildAtividadeFisicaOptions = {},
  sequencia = 1,
): AtividadeFisicaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Atividade Física deve ser um inteiro positivo.');
  }

  const descricao = `${baseDescricaoAtividadeFisica(options)} ${sequencia}`;
  if (descricao.length > 300) {
    throw new Error('A descrição de Atividade Física deve ter até 300 caracteres.');
  }

  return { descricao, ativo: options.ativo || 'Sim' };
}

export function isAtividadeFisicaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
