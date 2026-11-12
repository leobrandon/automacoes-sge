export const TIPOS_CARGO = ['Administrativo', 'Magistério'] as const;
export type TipoCargo = typeof TIPOS_CARGO[number];

export interface CargoData {
  descricao: string;
  tipo: TipoCargo;
  somenteEfetivos: boolean;
  formacaoSuperior: boolean;
  atividadesEDeveres: string;
  sequencia: number;
}

export interface BuildCargoOptions {
  descricao?: string;
  tipo?: string;
  somenteEfetivos?: boolean;
  formacaoSuperior?: boolean;
  atividadesEDeveres?: string;
}

export function buildCargo(options: BuildCargoOptions = {}, sequencia = 1): CargoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência do Cargo deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Cargo';
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição do Cargo deve começar com "QAAUTO".');
  }

  const descricao = `${base} ${sequencia}`;
  if (descricao.length > 100) {
    throw new Error('A descrição do Cargo deve ter no máximo 100 caracteres.');
  }

  const tipoInformado = options.tipo?.trim();
  if (!tipoInformado) {
    throw new Error('O tipo do Cargo é obrigatório.');
  }
  if (!TIPOS_CARGO.includes(tipoInformado as TipoCargo)) {
    throw new Error('Tipo do cargo fora das opções conhecidas: Administrativo ou Magistério.');
  }

  const somenteEfetivos = options.somenteEfetivos ?? false;
  const formacaoSuperior = options.formacaoSuperior ?? false;
  if (typeof somenteEfetivos !== 'boolean' || typeof formacaoSuperior !== 'boolean') {
    throw new Error('Os indicadores Somente Efetivos e Formação Superior devem ser booleanos.');
  }

  const atividadesEDeveres = options.atividadesEDeveres ?? '';
  if (typeof atividadesEDeveres !== 'string' || atividadesEDeveres.length > 65000) {
    throw new Error('Atividades e Deveres deve ser um texto de até 65000 caracteres.');
  }

  return {
    descricao,
    tipo: tipoInformado as TipoCargo,
    somenteEfetivos,
    formacaoSuperior,
    atividadesEDeveres,
    sequencia,
  };
}

export function isCargoQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
