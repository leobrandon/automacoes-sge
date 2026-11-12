import fs from 'node:fs';
import path from 'node:path';
import {
  ASSINATURAS_FICHA,
  buildFichaAvaliativa,
  FORMAS_AVALIACAO_FICHA,
  PERIODICIDADES_FICHA,
  type BuildFichaAvaliativaOptions,
} from '../../../../src/factories/ficha-avaliativa.factory';

export interface ConfiguracaoCriacaoFichaAvaliativa {
  quantidade: number;
  dados: BuildFichaAvaliativaOptions;
}

export interface ConfiguracaoExclusaoFichaAvaliativa {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  descricao: string;
}

function lerObjeto(nomeArquivo = 'dados_ficha_avaliativa.json'): Record<string, unknown> {
  const caminho = path.resolve(__dirname, nomeArquivo);
  const valor: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new Error(`${nomeArquivo} deve conter um objeto JSON.`);
  }
  return valor as Record<string, unknown>;
}

export function lerConfiguracaoExclusaoFichaAvaliativa(): ConfiguracaoExclusaoFichaAvaliativa {
  const config = lerObjeto('dados_exclusao_ficha_avaliativa.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false.');
  }
  const termoGeral = texto(config, 'termoGeral') || 'QAAUTO';
  if (termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }
  const descricao = texto(config, 'descricao') || '';
  if (descricao && !/^QAAUTO\b/i.test(descricao)) {
    throw new Error('A descrição individual deve começar com QAAUTO.');
  }
  if (config.excluirTodasQAAUTO && descricao) {
    throw new Error('No modo em lote, deixe "descricao" vazia para evitar um alvo ambíguo.');
  }
  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, descricao };
}

function texto(config: Record<string, unknown>, campo: string): string | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'string') throw new Error(`O campo "${campo}" deve ser texto.`);
  return valor.trim() || undefined;
}

function opcao<T extends string>(config: Record<string, unknown>, campo: string, valores: readonly T[]): T | undefined {
  const valor = texto(config, campo);
  if (!valor) return undefined;
  if (!valores.includes(valor as T)) throw new Error(`Valor "${valor}" inválido para "${campo}".`);
  return valor as T;
}

export function lerConfiguracaoCriacaoFichaAvaliativa(): ConfiguracaoCriacaoFichaAvaliativa {
  const config = lerObjeto();
  const quantidade = config.quantidade === undefined || config.quantidade === '' ? 1 : Number(config.quantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) throw new Error('"quantidade" deve ser um inteiro positivo.');
  const dados: BuildFichaAvaliativaOptions = {
    descricao: texto(config, 'descricao'),
    tituloParaImpressao: texto(config, 'tituloParaImpressao'),
    formaAvaliacao: opcao(config, 'formaAvaliacao', FORMAS_AVALIACAO_FICHA),
    periodicidade: opcao(config, 'periodicidade', PERIODICIDADES_FICHA),
    assinatura: opcao(config, 'assinatura', ASSINATURAS_FICHA),
    informacaoComplementar: texto(config, 'informacaoComplementar'),
    agrupador: texto(config, 'agrupador'),
    topico: texto(config, 'topico'),
    desempenhoFinal: texto(config, 'desempenhoFinal'),
  };
  buildFichaAvaliativa(dados, 1);
  return { quantidade, dados };
}
