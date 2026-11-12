/** Tipos rodoviários que exigem os campos "obrigatorioPorTipo" (combustível, placa, renavam, ano, IPVA, KM). */
export const TIPOS_VEICULO_RODOVIARIO = [
  'Rodoviário - Outro',
  'Rodoviário - Ônibus',
  'Rodoviário - Microônibus',
  'Rodoviário - Vans/Kombis',
] as const;

export type TipoVeiculoRodoviario = (typeof TIPOS_VEICULO_RODOVIARIO)[number];

const LIMITE_MODELO = 45;
const LIMITE_CAPACIDADE = 11;

export interface VeiculoData {
  modelo: string;
  tipo: TipoVeiculoRodoviario;
  /** Placa sem máscara (7 caracteres); a tela exibe `AAA-1A23`. */
  placa: string;
  renavam: string;
  ano: number;
  capacidade: number;
  tipoCombustivel: string;
  mesVencimentoIpva: string;
  /** Valor do select: `Proprio` ou `Locado`. */
  vinculo: string;
  categoriaCnh: string;
  kmInicial: number;
  dataKmInicial: string;
  sequencia: number;
}

export type BuildVeiculoOptions = Partial<Pick<VeiculoData, 'modelo' | 'tipo' | 'ano' | 'capacidade'>>;

/**
 * Placa única por sequência no formato Mercosul `QAA` + dígito + letra + 2 dígitos.
 * O SGE recusa placa repetida ("Já existe um veículo cadastrado com esta placa.").
 */
export function placaQAAuto(sequencia: number): string {
  const indice = sequencia - 1;
  const dezenas = String(indice % 100).padStart(2, '0');
  const letra = String.fromCharCode(65 + (Math.floor(indice / 100) % 26));
  const digito = Math.floor(indice / 2600) % 10;
  return `QAA${digito}${letra}${dezenas}`;
}

export function formatarPlaca(placa: string): string {
  return `${placa.slice(0, 3)}-${placa.slice(3)}`;
}

/** Modelo `QAAUTO <base> <sequência>`; os demais obrigatórios têm padrão válido. */
export function buildVeiculo(options: BuildVeiculoOptions = {}, sequencia = 1): VeiculoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1 || sequencia > 26000) {
    throw new Error('A sequência de Veículo deve ser um inteiro entre 1 e 26000.');
  }

  const base = options.modelo?.trim() || 'QAAUTO Veiculo';
  if (!isVeiculoQAAuto(base)) {
    throw new Error('O modelo/descrição do Veículo deve começar com QAAUTO.');
  }
  const modelo = `${base} ${sequencia}`;
  if (modelo.length > LIMITE_MODELO) {
    throw new Error(`O modelo/descrição do Veículo deve ter até ${LIMITE_MODELO} caracteres.`);
  }

  const tipo = options.tipo ?? 'Rodoviário - Vans/Kombis';
  if (!TIPOS_VEICULO_RODOVIARIO.includes(tipo)) {
    throw new Error(`Tipo de veículo não suportado: ${tipo}. Use: ${TIPOS_VEICULO_RODOVIARIO.join(' | ')}.`);
  }

  const ano = options.ano ?? 2020;
  if (!Number.isSafeInteger(ano) || ano < 1900 || ano > 9999) {
    throw new Error('O Ano do Veículo deve ter 4 dígitos.');
  }
  const capacidade = options.capacidade ?? 20;
  if (!Number.isSafeInteger(capacidade) || capacidade < 1 || String(capacidade).length > LIMITE_CAPACIDADE) {
    throw new Error('A Capacidade do Veículo deve ser um inteiro positivo.');
  }

  return {
    modelo,
    tipo,
    placa: placaQAAuto(sequencia),
    renavam: `1${String(sequencia).padStart(10, '0')}`,
    ano,
    capacidade,
    tipoCombustivel: 'Diesel',
    mesVencimentoIpva: 'Janeiro',
    vinculo: 'Proprio',
    categoriaCnh: 'D',
    kmInicial: 1000,
    dataKmInicial: '01/01/2026',
    sequencia,
  };
}

export function isVeiculoQAAuto(modelo: string): boolean {
  return /^QAAUTO\b/i.test(modelo.trim());
}
