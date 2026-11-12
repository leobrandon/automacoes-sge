import type {ReceitaOpcoes} from '../../../../src/factories/centro-custos.factory';
import {lerConfiguracaoCriacao, lerConfiguracaoExclusao, type ConfiguracaoCriacao, type ConfiguracaoExclusao} from '../../Centro de Custos/centro_custos_config';

const campos = ['descricao', 'dataRecebimento', 'destino', 'programaFinanceiro', 'categoria', 'subcategoria', 'origemRecurso', 'valor', 'observacao'];

export function configCriacaoReceita(): ConfiguracaoCriacao<ReceitaOpcoes> {
  return lerConfiguracaoCriacao<ReceitaOpcoes>(__dirname, 'dados_receita.json', campos);
}

export function configExclusaoReceita(): ConfiguracaoExclusao {
  return lerConfiguracaoExclusao(__dirname, 'dados_exclusao_receita.json');
}
