import path from 'node:path';
import type { BuildAcompanhamentoOptions } from '../../../src/factories/acompanhamento.factory';
import {
  lerJsonObjeto,
  quantidadeConfigurada,
  textoOpcional,
  type JsonObjeto,
} from '../../../src/helpers/config-json.helper';

export interface ConfiguracaoCriacaoAcompanhamento {
  quantidade: number;
  dados: BuildAcompanhamentoOptions;
}

export interface ConfiguracaoConclusaoAcompanhamento {
  tipoPauta: string;
  escola: string;
  periodo: string;
}

/** Número inteiro opcional: vazio ou ausente vira undefined. */
function inteiroOpcional(config: JsonObjeto, chave: string): number | undefined {
  const valor = config[chave];
  if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) return undefined;
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero)) throw new Error(`"${chave}" deve ser um número inteiro.`);
  return numero;
}

export function lerConfiguracaoCriacaoAcompanhamento(): ConfiguracaoCriacaoAcompanhamento {
  const config = lerJsonObjeto(path.resolve(__dirname, 'dados_acompanhamento.json'));
  return {
    quantidade: quantidadeConfigurada(config),
    dados: {
      tipoPauta: textoOpcional(config, 'tipoPauta'),
      escola: textoOpcional(config, 'escola'),
      periodo: textoOpcional(config, 'periodo'),
      percentualResposta: inteiroOpcional(config, 'percentualResposta'),
    },
  };
}

export function lerConfiguracaoConclusaoAcompanhamento(): ConfiguracaoConclusaoAcompanhamento {
  const config = lerJsonObjeto(path.resolve(__dirname, 'dados_conclusao_acompanhamento.json'));
  const tipoPauta = textoOpcional(config, 'tipoPauta') ?? '';
  const escola = textoOpcional(config, 'escola') ?? '';
  const periodo = textoOpcional(config, 'periodo') ?? '';
  if (!/^QAAUTO\b/i.test(tipoPauta) || !escola || !periodo) {
    throw new Error(
      'Informe em dados_conclusao_acompanhamento.json o tipoPauta (iniciado por QAAUTO), a escola e o período exatos do acompanhamento a concluir.',
    );
  }
  return { tipoPauta, escola, periodo };
}
