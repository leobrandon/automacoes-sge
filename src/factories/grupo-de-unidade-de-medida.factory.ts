import { montarDescricaoQaauto } from './itens-configuracao.factory';

export interface GrupoDeUnidadeDeMedidaData {
  descricao: string;
  /** Texto (ou parte) da unidade de medida existente no tenant; vazio usa a primeira da lista. */
  unidadeDeMedida?: string;
}

export type BuildGrupoDeUnidadeDeMedidaOptions = Partial<GrupoDeUnidadeDeMedidaData>;

export function buildGrupoDeUnidadeDeMedida(
  options: BuildGrupoDeUnidadeDeMedidaOptions = {},
  sequencia = 1,
): GrupoDeUnidadeDeMedidaData {
  return {
    descricao: montarDescricaoQaauto(options.descricao, 'QAAUTO Grupo de Unidades', sequencia, 128, 'Descrição do Grupo de Unidade de Medida'),
    unidadeDeMedida: options.unidadeDeMedida?.trim() || undefined,
  };
}
