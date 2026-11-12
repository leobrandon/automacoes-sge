const LIMITE_DESCRICAO = 255;
const LIMITE_ANOS = 9999;

export interface DepreciacaoPatrimonioData {
  /** Vazio = primeira categoria disponível no tenant (dado de apoio, não é criado pela automação). */
  categoria: string;
  descricao: string;
  taxaAnual: string;
  vidaUtil: string;
  revisao: string;
  observacao: string;
  sequencia: number;
}

export type BuildDepreciacaoPatrimonioOptions = Partial<Omit<DepreciacaoPatrimonioData, 'sequencia'>>;

function anos(valor: string | undefined, padrao: string, campo: string): string {
  const texto = valor?.trim() || padrao;
  const numero = Number(texto);
  if (!/^\d+$/.test(texto) || numero < 1 || numero > LIMITE_ANOS) {
    throw new Error(`${campo} deve ser um inteiro entre 1 e ${LIMITE_ANOS}.`);
  }
  return String(numero);
}

/** Descrição `QAAUTO <base> <sequência>`; todos os campos da tela são obrigatórios. */
export function buildDepreciacaoPatrimonio(
  options: BuildDepreciacaoPatrimonioOptions = {},
  sequencia = 1,
): DepreciacaoPatrimonioData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Depreciação deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Depreciacao';
  if (!isDepreciacaoPatrimonioQAAuto(base)) {
    throw new Error('A descrição de Depreciação deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Depreciação deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  const taxaAnual = options.taxaAnual?.trim() || '10,00';
  if (!/^\d{1,3},\d{2}$/.test(taxaAnual)) {
    throw new Error('A taxa anual deve seguir o formato 10,00.');
  }

  return {
    categoria: options.categoria?.trim() || '',
    descricao,
    taxaAnual,
    vidaUtil: anos(options.vidaUtil, '10', 'A vida útil'),
    revisao: anos(options.revisao, '5', 'A revisão'),
    observacao: options.observacao?.trim() || 'QAAUTO Observacao',
    sequencia,
  };
}

export function isDepreciacaoPatrimonioQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
