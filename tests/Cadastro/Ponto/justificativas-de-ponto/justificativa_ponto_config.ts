import fs from 'node:fs';
import path from 'node:path';
import {
  OPCOES_SIM_NAO_JUSTIFICATIVA_PONTO,
  TIPOS_JUSTIFICATIVA_PONTO,
  type BuildJustificativaPontoOptions,
  type OpcaoSimNaoJustificativaPonto,
  type TipoJustificativaPonto,
} from '../../../../src/factories/justificativa-ponto.factory';

export interface ConfiguracaoCriacaoJustificativaPonto {
  quantidade: number;
  dados: BuildJustificativaPontoOptions;
}

export interface ConfiguracaoExclusaoJustificativaPonto {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  descricao: string;
}

function objetoJson(nome: string): Record<string, unknown> {
  const caminho = path.resolve(__dirname, nome);
  const valor: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new Error(`${nome} deve conter um objeto JSON.`);
  }
  return valor as Record<string, unknown>;
}

function textoOpcional(config: Record<string, unknown>, campo: string): string | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor === 'number' && campo === 'prazo') return String(valor);
  if (typeof valor !== 'string') throw new Error(`O campo "${campo}" deve ser texto.`);
  return valor.trim() || undefined;
}

function enumOpcional<T extends string>(config: Record<string, unknown>, campo: string, opcoes: readonly T[]): T | undefined {
  const valor = textoOpcional(config, campo);
  if (!valor) return undefined;
  if (!opcoes.includes(valor as T)) {
    throw new Error(`Valor "${valor}" inválido para "${campo}". Opções: ${opcoes.join(', ')}.`);
  }
  return valor as T;
}

export function lerConfiguracaoCriacaoJustificativaPonto(): ConfiguracaoCriacaoJustificativaPonto {
  const config = objetoJson('dados_justificativa_ponto.json');
  const quantidadeVazia = config.quantidade === undefined
    || config.quantidade === null
    || (typeof config.quantidade === 'string' && config.quantidade.trim() === '');
  const quantidade = quantidadeVazia ? 1 : Number(config.quantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  return {
    quantidade,
    dados: {
      descricao: textoOpcional(config, 'descricao'),
      sigla: textoOpcional(config, 'sigla'),
      codigo: textoOpcional(config, 'codigo'),
      prazo: textoOpcional(config, 'prazo'),
      tipo: enumOpcional<TipoJustificativaPonto>(config, 'tipo', TIPOS_JUSTIFICATIVA_PONTO),
      disponivelParaUnidades: enumOpcional<OpcaoSimNaoJustificativaPonto>(
        config, 'disponivelParaUnidades', OPCOES_SIM_NAO_JUSTIFICATIVA_PONTO,
      ),
      disponivelNaPreFolha: enumOpcional<OpcaoSimNaoJustificativaPonto>(
        config, 'disponivelNaPreFolha', OPCOES_SIM_NAO_JUSTIFICATIVA_PONTO,
      ),
    },
  };
}

export function lerConfiguracaoExclusaoJustificativaPonto(): ConfiguracaoExclusaoJustificativaPonto {
  const config = objetoJson('dados_exclusao_justificativa_ponto.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_justificativa_ponto.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const descricao = textoOpcional(config, 'descricao') || '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO && !/^QAAUTO\b/i.test(descricao)) {
    throw new Error('Informe em "descricao" o nome exato iniciado por QAAUTO.');
  }

  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, descricao };
}
