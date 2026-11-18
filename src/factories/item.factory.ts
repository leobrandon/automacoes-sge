export const NATUREZAS_ITEM = ['Custeio (C)', 'Capital (K)'] as const;
export const OPCOES_SIM_NAO_ITEM = ['Sim', 'Não'] as const;

export type NaturezaItem = typeof NATUREZAS_ITEM[number];
export type OpcaoSimNaoItem = typeof OPCOES_SIM_NAO_ITEM[number];

const BASE_DESCRICAO_PADRAO = 'QAAUTO Item';
const LIMITE_DESCRICAO = 128;

export interface ItemData {
  descricao: string;
  natureza: NaturezaItem;
  grupoUnidadeDeMedida?: string;
  categoria?: string;
  subCategoria?: string;
  marca?: string;
  modelo?: string;
  controlaEstoque?: OpcaoSimNaoItem;
  obrigarLote?: OpcaoSimNaoItem;
  obrigarDataValidade?: OpcaoSimNaoItem;
  sequencia: number;
}

export type BuildItemOptions = Partial<Omit<ItemData, 'sequencia'>>;

function textoLimpo(valor?: string): string | undefined {
  return valor?.trim() || undefined;
}

/** Verifica se a descrição inicia com o prefixo obrigatório QAAUTO. */
export function isItemQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}

/** Monta os dados determinísticos de um Item para criação via interface. */
export function buildItem(options: BuildItemOptions = {}, sequencia = 1): ItemData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Item deve ser um inteiro positivo.');
  }

  const base = textoLimpo(options.descricao) || BASE_DESCRICAO_PADRAO;
  if (!isItemQAAuto(base)) {
    throw new Error('A descrição de Item deve começar com QAAUTO.');
  }

  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição de Item deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }

  const natureza = options.natureza || 'Custeio (C)';
  if (!NATUREZAS_ITEM.includes(natureza)) {
    throw new Error(`Natureza "${natureza}" inválida. Opções: ${NATUREZAS_ITEM.join(', ')}.`);
  }

  return {
    descricao,
    natureza,
    grupoUnidadeDeMedida: textoLimpo(options.grupoUnidadeDeMedida),
    categoria: textoLimpo(options.categoria),
    subCategoria: textoLimpo(options.subCategoria),
    marca: textoLimpo(options.marca),
    modelo: textoLimpo(options.modelo),
    controlaEstoque: options.controlaEstoque,
    obrigarLote: options.obrigarLote,
    obrigarDataValidade: options.obrigarDataValidade,
    sequencia,
  };
}
