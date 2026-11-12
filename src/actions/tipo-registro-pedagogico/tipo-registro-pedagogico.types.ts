import type {
  TipoRegistroPedagogicoTipo,
  TipoTurmaRegistroPedagogico,
} from '../../factories/tipo-registro-pedagogico.factory';

export interface TipoRegistroPedagogicoCriado {
  descricao: string;
  tipo: TipoRegistroPedagogicoTipo;
  url: string;
}

export interface TipoRegistroPedagogicoAlvoExclusao {
  descricao: string;
  tipo: TipoRegistroPedagogicoTipo;
  tipoTurma: TipoTurmaRegistroPedagogico;
  ano: number;
  composicao?: string;
  anosEscolares?: string[];
}

export interface TipoRegistroPedagogicoExcluido {
  descricao: string;
  tipo: TipoRegistroPedagogicoTipo;
  url: string;
}
