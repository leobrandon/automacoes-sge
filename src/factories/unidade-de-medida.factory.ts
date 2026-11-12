import { montarDescricaoQaauto } from './itens-configuracao.factory';

export interface UnidadeDeMedidaData {
  /** Comprimento, Peso, Volume, Tempo ou Unidade; vazio mantém o padrão do SGE. */
  tipo?: string;
  descricao: string;
  abreviacao: string;
}

export type BuildUnidadeDeMedidaOptions = Partial<UnidadeDeMedidaData>;

/** Descrição (máx. 30) e abreviação (máx. 10) levam a sequência no final. */
export function buildUnidadeDeMedida(options: BuildUnidadeDeMedidaOptions = {}, sequencia = 1): UnidadeDeMedidaData {
  const descricao = montarDescricaoQaauto(options.descricao, 'QAAUTO Unidade', sequencia, 30, 'Descrição da Unidade de Medida');
  const abreviacao = `${options.abreviacao?.trim() || 'QAA'}${sequencia}`;
  if (abreviacao.length > 10) throw new Error(`Abreviação "${abreviacao}" excede 10 caracteres.`);
  return { tipo: options.tipo?.trim() || undefined, descricao, abreviacao };
}
