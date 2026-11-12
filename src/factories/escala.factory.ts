export const TIPOS_ESCALA = ['Cíclica', 'Mensal'] as const;
export type TipoEscala = typeof TIPOS_ESCALA[number];

export const LETRAS_SUFIXO_ESCALA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
export const HORARIO_CICLO_PADRAO = 'Horário Professor';

export interface EscalaData {
  descricao: string;
  tipo: TipoEscala;
  horario: string;
  sequencia: number;
  letra: string;
}

export interface BuildEscalaOptions {
  descricao?: string;
  tipo?: string;
  horario?: string;
}

/** Prefixo comum das descrições (sem a letra), usado para achar a próxima letra livre. */
export function prefixoDescricaoEscala(options: BuildEscalaOptions = {}, sequencia = 1): string {
  const base = options.descricao?.trim() || 'QAAUTO Escala de trabalho';
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição da Escala deve começar com "QAAUTO".');
  }
  return `${base} ${sequencia}`;
}

export function buildEscala(options: BuildEscalaOptions = {}, sequencia = 1, letra = 'A'): EscalaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência da Escala deve ser um inteiro positivo.');
  }

  if (!LETRAS_SUFIXO_ESCALA.includes(letra)) {
    throw new Error('A letra de sufixo da Escala deve estar entre A e Z.');
  }

  const descricao = `${prefixoDescricaoEscala(options, sequencia)} ${letra}`;

  const tipo = options.tipo?.trim() || TIPOS_ESCALA[0];
  if (!TIPOS_ESCALA.includes(tipo as TipoEscala)) {
    throw new Error('Tipo da Escala fora das opções conhecidas: Cíclica ou Mensal.');
  }

  const horario = options.horario?.trim() || HORARIO_CICLO_PADRAO;

  return { descricao, tipo: tipo as TipoEscala, horario, sequencia, letra };
}

export function isEscalaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
