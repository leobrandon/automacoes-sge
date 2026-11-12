export const OPCOES_ATIVO_ALERGIA = ['Sim', 'Não'] as const;

export type OpcaoAtivoAlergia = typeof OPCOES_ATIVO_ALERGIA[number];

export interface AlergiaData {
  descricao: string;
  ativo: OpcaoAtivoAlergia;
}

export type BuildAlergiaOptions = Partial<AlergiaData>;

/** Base da descrição (sem sequência); o SGE recusa descrições repetidas. */
export function baseDescricaoAlergia(options: BuildAlergiaOptions = {}): string {
  const base = options.descricao?.trim() || 'QAAUTO Alergia';
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição de Alergia deve começar com QAAUTO.');
  }
  return base;
}

export function buildAlergia(options: BuildAlergiaOptions = {}, sequencia = 1): AlergiaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Alergia deve ser um inteiro positivo.');
  }

  const descricao = `${baseDescricaoAlergia(options)} ${sequencia}`;
  if (descricao.length > 300) {
    throw new Error('A descrição de Alergia deve ter até 300 caracteres.');
  }

  return { descricao, ativo: options.ativo || 'Sim' };
}

export function isAlergiaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
