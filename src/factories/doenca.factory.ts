export const OPCOES_ATIVO_DOENCA = ['Sim', 'Não'] as const;

export type OpcaoAtivoDoenca = typeof OPCOES_ATIVO_DOENCA[number];

export interface DoencaData {
  descricao: string;
  ativo: OpcaoAtivoDoenca;
}

export type BuildDoencaOptions = Partial<DoencaData>;

/** Base da descrição (sem sequência); o SGE recusa descrições repetidas. */
export function baseDescricaoDoenca(options: BuildDoencaOptions = {}): string {
  const base = options.descricao?.trim() || 'QAAUTO Doença';
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição de Doença deve começar com QAAUTO.');
  }
  return base;
}

export function buildDoenca(options: BuildDoencaOptions = {}, sequencia = 1): DoencaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Doença deve ser um inteiro positivo.');
  }

  const descricao = `${baseDescricaoDoenca(options)} ${sequencia}`;
  if (descricao.length > 300) {
    throw new Error('A descrição de Doença deve ter até 300 caracteres.');
  }

  return { descricao, ativo: options.ativo || 'Sim' };
}

export function isDoencaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
