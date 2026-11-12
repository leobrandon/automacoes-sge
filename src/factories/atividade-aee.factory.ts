export const ATIVIDADES_AEE = [
  'Desenvolvimento de funções cognitivas',
  'Desenvolvimento de vida autônoma',
  'Enriquecimento curricular',
  'Ensino da informática acessível',
  'Ensino da Língua Brasileira de Sinais (Libras)',
  'Ensino da Língua Portuguesa como segunda língua',
  'Ensino das técnicas do cálculo no Soroban',
  'Ensino de Sistema Braille',
  'Ensino de técnicas para orientação e mobilidade',
  'Ensino de uso da Comunicação Alternativa e Aumentativa (CAA)',
  'Ensino de uso de recursos ópticos e não ópticos',
] as const;

export const OPCOES_ATIVO_ATIVIDADE_AEE = ['Sim', 'Não'] as const;

export type AtividadeAee = typeof ATIVIDADES_AEE[number];
export type OpcaoAtivoAee = typeof OPCOES_ATIVO_ATIVIDADE_AEE[number];

export interface AtividadeAeeData {
  descricao: string;
  atividadeAee: AtividadeAee;
  ativo: OpcaoAtivoAee;
}

export type BuildAtividadeAeeOptions = Partial<AtividadeAeeData>;

/** Usa uma descrição relacionada à atividade, mantendo a sequência como sufixo. */
export function buildAtividadeAee(options: BuildAtividadeAeeOptions = {}, sequencia = 1): AtividadeAeeData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Atividade de AEE deve ser um inteiro positivo.');
  }

  const atividadeAee = options.atividadeAee || 'Desenvolvimento de funções cognitivas';
  const base = options.descricao?.trim()
    || `QAAUTO ${atividadeAee}`;
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição de Atividade de AEE deve começar com QAAUTO.');
  }

  const descricao = `${base} ${sequencia}`;
  if (descricao.length > 100) {
    throw new Error('A descrição de Atividade de AEE deve ter até 100 caracteres.');
  }

  return {
    descricao,
    atividadeAee,
    ativo: options.ativo || 'Sim',
  };
}

export function isAtividadeAeeQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}

import { fakeData } from '../helpers/generators/fake-data';

