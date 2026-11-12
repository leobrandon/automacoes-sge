const LIMITE_TITULO = 100;
const LIMITE_DESCRICAO = 1000;

export interface MotivoConcessaoData {
  titulo: string;
  descricao: string;
  entregaDefinitiva: boolean;
  sequencia: number;
}

export type BuildMotivoConcessaoOptions = Partial<Omit<MotivoConcessaoData, 'sequencia'>>;

/** Título `QAAUTO <base> <sequência>`; Título e Descrição são obrigatórios e Entrega Definitiva inicia desligada. */
export function buildMotivoConcessao(options: BuildMotivoConcessaoOptions = {}, sequencia = 1): MotivoConcessaoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Motivo de Concessão deve ser um inteiro positivo.');
  }

  const base = options.titulo?.trim() || 'QAAUTO Motivo Concessao';
  if (!isMotivoConcessaoQAAuto(base)) {
    throw new Error('O título de Motivo de Concessão deve começar com QAAUTO.');
  }
  const titulo = `${base} ${sequencia}`;
  if (titulo.length > LIMITE_TITULO) {
    throw new Error(`O título de Motivo de Concessão deve ter até ${LIMITE_TITULO} caracteres.`);
  }

  const descricao = options.descricao?.trim() || `QAAUTO descricao do motivo de concessao ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Motivo de Concessão deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  return { titulo, descricao, entregaDefinitiva: options.entregaDefinitiva ?? false, sequencia };
}

export function isMotivoConcessaoQAAuto(titulo: string): boolean {
  return /^QAAUTO\b/i.test(titulo.trim());
}
