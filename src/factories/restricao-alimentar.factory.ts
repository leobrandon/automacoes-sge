export const OPCOES_ATIVO_RESTRICAO_ALIMENTAR = ['Sim', 'Não'] as const;

export type OpcaoAtivoRestricaoAlimentar = typeof OPCOES_ATIVO_RESTRICAO_ALIMENTAR[number];

export interface RestricaoAlimentarData {
  descricao: string;
  ativo: OpcaoAtivoRestricaoAlimentar;
}

export type BuildRestricaoAlimentarOptions = Partial<RestricaoAlimentarData>;

/** Base da descrição (sem sequência); o SGE recusa descrições repetidas. */
export function baseDescricaoRestricaoAlimentar(options: BuildRestricaoAlimentarOptions = {}): string {
  const base = options.descricao?.trim() || 'QAAUTO Restrição Alimentar';
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição de Restrição Alimentar deve começar com QAAUTO.');
  }
  return base;
}

export function buildRestricaoAlimentar(
  options: BuildRestricaoAlimentarOptions = {},
  sequencia = 1,
): RestricaoAlimentarData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Restrição Alimentar deve ser um inteiro positivo.');
  }

  const descricao = `${baseDescricaoRestricaoAlimentar(options)} ${sequencia}`;
  if (descricao.length > 300) {
    throw new Error('A descrição de Restrição Alimentar deve ter até 300 caracteres.');
  }

  return { descricao, ativo: options.ativo || 'Sim' };
}

export function isRestricaoAlimentarQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
