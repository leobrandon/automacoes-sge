import type {OrcamentoOpcoes} from '../../../../src/factories/centro-custos.factory';
import {lerConfiguracaoCriacao, lerConfiguracaoExclusao, type ConfiguracaoCriacao, type ConfiguracaoExclusao} from '../centro_custos_config';

const campos = ['descricao', 'exercicio', 'codigo', 'competenciaInicial', 'competenciaFinal', 'tipo', 'programaFinanceiro', 'destinatario', 'valorPrevisto'];

export function configCriacaoOrcamento(): ConfiguracaoCriacao<OrcamentoOpcoes> {
  return lerConfiguracaoCriacao<OrcamentoOpcoes>(__dirname, 'dados_orcamento.json', campos);
}

export function configExclusaoOrcamento(): ConfiguracaoExclusao {
  return lerConfiguracaoExclusao(__dirname, 'dados_exclusao_orcamento.json');
}
