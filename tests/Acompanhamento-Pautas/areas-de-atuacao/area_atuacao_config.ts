import path from 'node:path';
import type { BuildAreaAtuacaoOptions } from '../../../src/factories/area-atuacao.factory';
import {
  lerConfiguracaoExclusao,
  lerJsonObjeto,
  quantidadeConfigurada,
  textoOpcional,
  type ConfiguracaoExclusao,
} from '../../../src/helpers/config-json.helper';

export interface ConfiguracaoCriacaoAreaAtuacao {
  quantidade: number;
  dados: BuildAreaAtuacaoOptions;
}

export type ConfiguracaoExclusaoAreaAtuacao = ConfiguracaoExclusao;

export function lerConfiguracaoCriacaoAreaAtuacao(): ConfiguracaoCriacaoAreaAtuacao {
  const config = lerJsonObjeto(path.resolve(__dirname, 'dados_area_atuacao.json'));
  return {
    quantidade: quantidadeConfigurada(config),
    dados: {
      eixo: textoOpcional(config, 'eixo'),
      descricao: textoOpcional(config, 'descricao'),
    },
  };
}

export function lerConfiguracaoExclusaoAreaAtuacao(): ConfiguracaoExclusaoAreaAtuacao {
  const configuracao = lerConfiguracaoExclusao(path.resolve(__dirname, 'dados_exclusao_area_atuacao.json'));
  if (!configuracao.excluirTodasQAAUTO && !/^QAAUTO\b/i.test(configuracao.descricao)) {
    throw new Error('Informe em "descricao" a descrição exata iniciada por QAAUTO em dados_exclusao_area_atuacao.json.');
  }
  return configuracao;
}
