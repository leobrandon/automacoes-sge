export interface NecessidadeNutricionalDados {
  resolucao: string;
  grupo: string;
  atendimento: string;
  calorias: string;
  carboidratosMinimo: string;
  carboidratosMaximo: string;
  proteinasMinimo: string;
  proteinasMaximo: string;
  gordurasMinimo: string;
  gordurasMaximo: string;
}

export const camposNutricionais = [
  'calorias', 'carboidratosMinimo', 'carboidratosMaximo', 'proteinasMinimo', 'proteinasMaximo', 'gordurasMinimo', 'gordurasMaximo',
] as const;

/** Valores informados no formato exibido pelo SGE (ex.: "500,00"). */
export function buildNecessidadeNutricional(d: NecessidadeNutricionalDados): NecessidadeNutricionalDados {
  for (const campo of ['resolucao', 'grupo', 'atendimento'] as const) if (!d[campo].trim()) throw new Error(`Informe ${campo} no JSON.`);
  for (const campo of ['resolucao', 'grupo'] as const) {
    if (!/^QAAUTO\b/i.test(d[campo].trim())) throw new Error(`${campo} deve ser um dado de apoio QAAUTO.`);
  }
  for (const campo of camposNutricionais) {
    if (!/^\d{1,6},\d{2}$/.test(d[campo].trim())) throw new Error(`${campo} deve estar no formato 0,00 (ex.: 500,00).`);
  }
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.trim()])) as unknown as NecessidadeNutricionalDados;
}

/** A máscara dos campos é de centavos: digitar apenas os dígitos ("50000") produz "500,00". */
export const digitosDaMascara = (valor: string): string => valor.replace(/\D/g, '');
