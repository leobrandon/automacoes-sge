export const OPCOES_ATIVO_MEDICAMENTO = ['Sim', 'Não'] as const;

export type OpcaoAtivoMedicamento = typeof OPCOES_ATIVO_MEDICAMENTO[number];

export interface MedicamentoData {
  descricao: string;
  ativo: OpcaoAtivoMedicamento;
}

export type BuildMedicamentoOptions = Partial<MedicamentoData>;

/** Base da descrição (sem sequência); o SGE recusa descrições repetidas. */
export function baseDescricaoMedicamento(options: BuildMedicamentoOptions = {}): string {
  const base = options.descricao?.trim() || 'QAAUTO Medicamento';
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição de Medicamento deve começar com QAAUTO.');
  }
  return base;
}

export function buildMedicamento(options: BuildMedicamentoOptions = {}, sequencia = 1): MedicamentoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Medicamento deve ser um inteiro positivo.');
  }

  const descricao = `${baseDescricaoMedicamento(options)} ${sequencia}`;
  if (descricao.length > 300) {
    throw new Error('A descrição de Medicamento deve ter até 300 caracteres.');
  }

  return { descricao, ativo: options.ativo || 'Sim' };
}

export function isMedicamentoQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
