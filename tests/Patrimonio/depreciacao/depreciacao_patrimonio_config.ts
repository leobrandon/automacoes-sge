import fs from 'node:fs';
import path from 'node:path';
import type { BuildDepreciacaoPatrimonioOptions } from '../../../src/factories/depreciacao-patrimonio.factory';

export interface ConfiguracaoCriacaoDepreciacaoPatrimonio {
  quantidade: number;
  dados: BuildDepreciacaoPatrimonioOptions;
}

export interface ConfiguracaoExclusaoDepreciacaoPatrimonio {
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
  if (typeof valor === 'number') return String(valor);
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

export function lerConfiguracaoCriacaoDepreciacaoPatrimonio(): ConfiguracaoCriacaoDepreciacaoPatrimonio {
  const config = objetoJson('dados_depreciacao_patrimonio.json');
  const quantidade = inteiroOpcional(config, 'quantidade') ?? 1;
  if (quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  return {
    quantidade,
    dados: {
      categoria: textoOpcional(config, 'categoria'),
      descricao: textoOpcional(config, 'descricao'),
      taxaAnual: textoOpcional(config, 'taxaAnual'),
      vidaUtil: textoOpcional(config, 'vidaUtil'),
      revisao: textoOpcional(config, 'revisao'),
      observacao: textoOpcional(config, 'observacao'),
    },
  };
}

export function lerConfiguracaoExclusaoDepreciacaoPatrimonio(): ConfiguracaoExclusaoDepreciacaoPatrimonio {
  const config = objetoJson('dados_exclusao_depreciacao_patrimonio.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_depreciacao_patrimonio.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const descricao = textoOpcional(config, 'descricao') || '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO && !/^QAAUTO\b/i.test(descricao)) {
    throw new Error('Informe em "descricao" a descrição exata iniciada por QAAUTO.');
  }

  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, descricao };
}
