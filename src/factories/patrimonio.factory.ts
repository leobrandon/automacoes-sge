const LIMITE_PLACA = 45;
const LIMITE_SERIE = 45;
const LIMITE_OBSERVACAO = 512;

export interface PatrimonioData {
  /** Vazio = primeira unidade disponível para o usuário no tenant. */
  unidade: string;
  /** Vazio = primeiro produto cadastrado no tenant (dado de apoio, não é criado pela automação). */
  produto: string;
  /** Vazio = primeira depreciação cadastrada no tenant (dado de apoio, não é criado pela automação). */
  depreciacao: string;
  situacao: string;
  /** Chave única do SGE e identificador QAAUTO do registro: `QAAUTO <base> <sequência>`. */
  placa: string;
  /** Opcional: só é preenchido quando informado. */
  numeroSerie: string;
  /** Opcional: só é preenchido quando informado. */
  observacao: string;
  sequencia: number;
}

/** `placa` aqui é a base do identificador; a sequência é acrescentada pela factory. */
export type BuildPatrimonioOptions = Partial<Omit<PatrimonioData, 'sequencia'>>;

/**
 * Obrigatórios da tela: Unidade, Produto, Depreciação e Situação. A placa recebe o prefixo QAAUTO
 * porque o patrimônio não tem campo de nome e o SGE recusa placa repetida.
 */
export function buildPatrimonio(options: BuildPatrimonioOptions = {}, sequencia = 1): PatrimonioData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Patrimônio deve ser um inteiro positivo.');
  }

  const base = options.placa?.trim() || 'QAAUTO Patrimonio';
  if (!isPatrimonioQAAuto(base)) {
    throw new Error('A placa de Patrimônio deve começar com QAAUTO.');
  }
  const placa = `${base} ${sequencia}`;
  if (placa.length > LIMITE_PLACA) {
    throw new Error(`A placa de Patrimônio deve ter até ${LIMITE_PLACA} caracteres.`);
  }

  const numeroSerie = options.numeroSerie?.trim() || '';
  if (numeroSerie.length > LIMITE_SERIE) {
    throw new Error(`O número de série deve ter até ${LIMITE_SERIE} caracteres.`);
  }
  const observacao = options.observacao?.trim() || '';
  if (observacao.length > LIMITE_OBSERVACAO) {
    throw new Error(`A observação deve ter até ${LIMITE_OBSERVACAO} caracteres.`);
  }

  return {
    unidade: options.unidade?.trim() || '',
    produto: options.produto?.trim() || '',
    depreciacao: options.depreciacao?.trim() || '',
    situacao: options.situacao?.trim() || 'Bom',
    placa,
    numeroSerie,
    observacao,
    sequencia,
  };
}

export function isPatrimonioQAAuto(placa: string): boolean {
  return /^QAAUTO\b/i.test(placa.trim());
}
