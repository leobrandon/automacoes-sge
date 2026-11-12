import type {CustoOpcoes} from '../../../../src/factories/centro-custos.factory';
import {lerConfiguracaoCriacao, lerConfiguracaoExclusao, type ConfiguracaoCriacao, type ConfiguracaoExclusao} from '../centro_custos_config';

const campos = ['descricao', 'situacao', 'destinatario', 'categoria', 'subcategoria', 'tipoCusto', 'orcamento', 'valor', 'dataLancamento', 'competencia'];

export function configCriacaoCusto(): ConfiguracaoCriacao<CustoOpcoes> {
  return lerConfiguracaoCriacao<CustoOpcoes>(__dirname, 'dados_custo.json', campos);
}

export function configExclusaoCusto(): ConfiguracaoExclusao {
  return lerConfiguracaoExclusao(__dirname, 'dados_exclusao_custo.json');
}
