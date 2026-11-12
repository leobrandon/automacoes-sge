import fs from 'node:fs';
import path from 'node:path';
import type { BuildFacultativoFeriadoOptions } from '../../../../src/factories/facultativo-feriado.factory';

export interface ConfiguracaoCriacaoFacultativoFeriado {
  quantidade: number;
  dados: BuildFacultativoFeriadoOptions;
}

export interface ConfiguracaoExclusaoFacultativoFeriado {
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

function booleanoOpcional(config: Record<string, unknown>, campo: string): boolean | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'boolean') throw new Error(`O campo "${campo}" deve ser true ou false.`);
  return valor;
}

function dataOpcional(config: Record<string, unknown>, campo: string): string | undefined {
  const valor = textoOpcional(config, campo);
  if (valor && !/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
    throw new Error(`O campo "${campo}" deve estar no formato DD/MM/AAAA.`);
  }
  return valor;
}

export function lerConfiguracaoCriacaoFacultativoFeriado(): ConfiguracaoCriacaoFacultativoFeriado {
  const config = objetoJson('dados_facultativo_feriado.json');
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
      data: dataOpcional(config, 'data'),
      facultativo: booleanoOpcional(config, 'facultativo'),
    },
  };
}

export function lerConfiguracaoExclusaoFacultativoFeriado(): ConfiguracaoExclusaoFacultativoFeriado {
  const config = objetoJson('dados_exclusao_facultativo_feriado.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_facultativo_feriado.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const descricao = textoOpcional(config, 'descricao') || '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO && !descricao) {
    throw new Error('Informe em "descricao" o nome exato do registro QAAUTO a excluir, ou use "excluirTodasQAAUTO": true.');
  }
  if (!config.excluirTodasQAAUTO && !/^QAAUTO\b/i.test(descricao)) {
    throw new Error('Informe em "descricao" o nome exato iniciado por QAAUTO.');
  }

  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, descricao };
}
