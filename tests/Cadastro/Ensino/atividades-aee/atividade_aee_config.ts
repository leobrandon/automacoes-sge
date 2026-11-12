import fs from 'node:fs';
import path from 'node:path';
import {
  ATIVIDADES_AEE,
  OPCOES_ATIVO_ATIVIDADE_AEE,
  type BuildAtividadeAeeOptions,
  type AtividadeAee,
  type OpcaoAtivoAee,
} from '../../../../src/factories/atividade-aee.factory';

export interface ConfiguracaoCriacaoAtividadeAee {
  quantidade: number;
  dados: BuildAtividadeAeeOptions;
}

export interface ConfiguracaoExclusaoAtividadeAee {
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

export function lerConfiguracaoCriacaoAtividadeAee(): ConfiguracaoCriacaoAtividadeAee {
  const config = objetoJson('dados_atividade_aee.json');
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
      atividadeAee: enumOpcional<AtividadeAee>(config, 'atividadeAee', ATIVIDADES_AEE),
      ativo: enumOpcional<OpcaoAtivoAee>(config, 'ativo', OPCOES_ATIVO_ATIVIDADE_AEE),
    },
  };
}

export function lerConfiguracaoExclusaoAtividadeAee(): ConfiguracaoExclusaoAtividadeAee {
  const config = objetoJson('dados_exclusao_atividade_aee.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_atividade_aee.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const descricao = textoOpcional(config, 'descricao') || '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO && descricao && !/^QAAUTO\b/i.test(descricao)) {
    throw new Error('Informe em "descricao" o nome exato iniciado por QAAUTO.');
  }

  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, descricao };
}
