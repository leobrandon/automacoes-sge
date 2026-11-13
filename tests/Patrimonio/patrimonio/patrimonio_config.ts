import path from 'node:path';
import type { BuildPatrimonioOptions } from '../../../src/factories/patrimonio.factory';
import { lerJsonObjeto, quantidadeConfigurada, textoOpcional } from '../../../src/helpers/config-json.helper';

export interface ConfiguracaoCriacaoPatrimonio {
  quantidade: number;
  dados: BuildPatrimonioOptions;
}

export interface ConfiguracaoExclusaoPatrimonio {
  placa: string;
}

/**
 * Credenciais opcionais do tenant do Patrimônio (SGE_USUARIO_PATRIMONIO / SGE_SENHA_PATRIMONIO no .env).
 * Sem elas, usa SGE_USUARIO/SGE_SENHA. Nunca grave credenciais em arquivos versionados.
 */
export function opcoesLoginPatrimonio(): { baseUrl: string; usuario?: string; senha?: string; timeout: number } {
  const usuario = process.env.SGE_USUARIO_PATRIMONIO?.trim() || undefined;
  const senha = process.env.SGE_SENHA_PATRIMONIO?.trim() || undefined;
  if (!!usuario !== !!senha) {
    throw new Error('Defina SGE_USUARIO_PATRIMONIO e SGE_SENHA_PATRIMONIO juntas no .env.');
  }
  return { baseUrl: process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br', usuario, senha, timeout: 60000 };
}

export function lerConfiguracaoCriacaoPatrimonio(): ConfiguracaoCriacaoPatrimonio {
  const config = lerJsonObjeto(path.resolve(__dirname, 'dados_patrimonio.json'));
  return {
    quantidade: quantidadeConfigurada(config),
    dados: {
      unidade: textoOpcional(config, 'unidade'),
      produto: textoOpcional(config, 'produto'),
      depreciacao: textoOpcional(config, 'depreciacao'),
      situacao: textoOpcional(config, 'situacao'),
      placa: textoOpcional(config, 'placa'),
      numeroSerie: textoOpcional(config, 'numeroSerie'),
      observacao: textoOpcional(config, 'observacao'),
    },
  };
}

export function lerConfiguracaoExclusaoPatrimonio(): ConfiguracaoExclusaoPatrimonio {
  const config = lerJsonObjeto(path.resolve(__dirname, 'dados_exclusao_patrimonio.json'));
  const placa = textoOpcional(config, 'placa') ?? '';
  if (!/^QAAUTO\b/i.test(placa)) {
    throw new Error('Informe em "placa" a placa exata iniciada por QAAUTO em dados_exclusao_patrimonio.json.');
  }
  return { placa };
}
