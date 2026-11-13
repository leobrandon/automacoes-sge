import path from 'node:path';
import type { BuildMetricaAcompanhamentoOptions } from '../../../src/factories/metrica-acompanhamento.factory';
import {
  lerJsonObjeto,
  quantidadeConfigurada,
  textoOpcional,
  type JsonObjeto,
} from '../../../src/helpers/config-json.helper';

export interface ConfiguracaoCriacaoMetricaAcompanhamento {
  quantidade: number;
  dados: BuildMetricaAcompanhamentoOptions;
}

export interface ConfiguracaoExclusaoMetricaAcompanhamento {
  /** true = remove todas as Métricas de classificação QAAUTO; false = só a identificada abaixo. */
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  /** Exclusão individual: classificação e faixa exatas (a faixa identifica o registro). */
  classificacao: string;
  pontuacaoMinima: number;
  pontuacaoMaxima: number;
}

/** Número inteiro opcional: vazio ou ausente vira undefined. */
function inteiroOpcional(config: JsonObjeto, chave: string): number | undefined {
  const valor = config[chave];
  if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) return undefined;
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero) || numero < 0) throw new Error(`"${chave}" deve ser um inteiro não negativo.`);
  return numero;
}

export function lerConfiguracaoCriacaoMetricaAcompanhamento(): ConfiguracaoCriacaoMetricaAcompanhamento {
  const config = lerJsonObjeto(path.resolve(__dirname, 'dados_metrica_acompanhamento.json'));
  return {
    quantidade: quantidadeConfigurada(config),
    dados: {
      classificacao: textoOpcional(config, 'classificacao'),
      pontuacaoMinima: inteiroOpcional(config, 'pontuacaoMinima'),
      pontuacaoMaxima: inteiroOpcional(config, 'pontuacaoMaxima'),
      cor: textoOpcional(config, 'cor'),
      descricao: textoOpcional(config, 'descricao'),
    },
  };
}

export function lerConfiguracaoExclusaoMetricaAcompanhamento(): ConfiguracaoExclusaoMetricaAcompanhamento {
  const config = lerJsonObjeto(path.resolve(__dirname, 'dados_exclusao_metrica_acompanhamento.json'));
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_metrica_acompanhamento.json.');
  }
  const termoGeral = textoOpcional(config, 'termoGeral') ?? 'QAAUTO';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A limpeza em lote está limitada ao termo "QAAUTO".');
  }

  const classificacao = textoOpcional(config, 'classificacao') ?? '';
  const pontuacaoMinima = inteiroOpcional(config, 'pontuacaoMinima');
  const pontuacaoMaxima = inteiroOpcional(config, 'pontuacaoMaxima');
  if (!config.excluirTodasQAAUTO) {
    if (!/^QAAUTO\b/i.test(classificacao)) {
      throw new Error('Informe em "classificacao" a classificação exata iniciada por QAAUTO em dados_exclusao_metrica_acompanhamento.json.');
    }
    if (pontuacaoMinima === undefined || pontuacaoMaxima === undefined) {
      throw new Error('Informe "pontuacaoMinima" e "pontuacaoMaxima" da Métrica a excluir (a faixa identifica o registro).');
    }
  }
  return {
    excluirTodasQAAUTO: config.excluirTodasQAAUTO,
    termoGeral,
    classificacao,
    pontuacaoMinima: pontuacaoMinima ?? 0,
    pontuacaoMaxima: pontuacaoMaxima ?? 0,
  };
}
