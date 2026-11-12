import { montarDescricaoQaauto } from './itens-configuracao.factory';

export interface CategoriaData {
  nome: string;
  /** Texto (ou parte) do tipo existente no tenant; vazio usa o primeiro da lista. */
  tipoDeCategoria?: string;
  /** Subcategoria criada junto, para completar o cenário. */
  subcategoria: string;
}

export type BuildCategoriaOptions = Partial<CategoriaData>;

/** Nome e subcategoria (máx. 45 cada) levam a sequência no final. */
export function buildCategoria(options: BuildCategoriaOptions = {}, sequencia = 1): CategoriaData {
  return {
    nome: montarDescricaoQaauto(options.nome, 'QAAUTO Categoria', sequencia, 45, 'Nome da Categoria'),
    tipoDeCategoria: options.tipoDeCategoria?.trim() || undefined,
    subcategoria: montarDescricaoQaauto(options.subcategoria, 'QAAUTO Subcategoria', sequencia, 45, 'Nome da Subcategoria'),
  };
}
