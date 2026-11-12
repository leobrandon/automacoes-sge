import { montarDescricaoQaauto } from './itens-configuracao.factory';

export interface TipoDeCategoriaData {
  descricao: string;
}

export type BuildTipoDeCategoriaOptions = Partial<TipoDeCategoriaData>;

export function buildTipoDeCategoria(options: BuildTipoDeCategoriaOptions = {}, sequencia = 1): TipoDeCategoriaData {
  return {
    descricao: montarDescricaoQaauto(options.descricao, 'QAAUTO Tipo de Categoria', sequencia, 128, 'Descrição do Tipo de Categoria'),
  };
}
