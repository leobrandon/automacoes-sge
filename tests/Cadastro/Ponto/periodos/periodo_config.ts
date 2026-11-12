import fs from 'node:fs';
import path from 'node:path';
import type { BuildPeriodoOptions } from '../../../../src/factories/periodo.factory';

export interface ConfiguracaoCriacaoPeriodo {
  quantidade: number;
  dados: BuildPeriodoOptions;
}

export interface ConfiguracaoExclusaoPeriodo {
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

function inteiroOpcional(config: Record<string, unknown>, campo: string): number | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) return undefined;
  const numero = Number(valor);
  if (!Number.isSafeInteger(numero)) throw new Error(`O campo "${campo}" deve ser um número inteiro.`);
  return numero;
}

export function lerConfiguracaoCriacaoPeriodo(): ConfiguracaoCriacaoPeriodo {
  const config = objetoJson('dados_periodo.json');
  const quantidade = inteiroOpcional(config, 'quantidade') ?? 1;
  if (quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  return {
    quantidade,
    dados: {
      descricao: textoOpcional(config, 'descricao'),
      diaInicio: inteiroOpcional(config, 'diaInicio'),
    },
  };
}

export function lerConfiguracaoExclusaoPeriodo(): ConfiguracaoExclusaoPeriodo {
  const config = objetoJson('dados_exclusao_periodo.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_periodo.json.');
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
