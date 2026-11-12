import fs from 'node:fs';
import path from 'node:path';
import type { BuildLocalAlmoxarifadoOptions } from '../../../../src/factories/local-almoxarifado.factory';

export interface ConfiguracaoCriacaoLocalAlmoxarifado {
  quantidade: number;
  dados: BuildLocalAlmoxarifadoOptions;
}

export interface ConfiguracaoExclusaoLocalAlmoxarifado {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  nome: string;
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

export function lerConfiguracaoCriacaoLocalAlmoxarifado(): ConfiguracaoCriacaoLocalAlmoxarifado {
  const config = objetoJson('dados_local_almoxarifado.json');
  const quantidade = inteiroOpcional(config, 'quantidade') ?? 1;
  if (quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  return {
    quantidade,
    dados: {
      nome: textoOpcional(config, 'nome'),
      telefone: textoOpcional(config, 'telefone'),
      responsavel: textoOpcional(config, 'responsavel'),
    },
  };
}

export function lerConfiguracaoExclusaoLocalAlmoxarifado(): ConfiguracaoExclusaoLocalAlmoxarifado {
  const config = objetoJson('dados_exclusao_local_almoxarifado.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_local_almoxarifado.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const nome = textoOpcional(config, 'nome') || '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO && !/^QAAUTO\b/i.test(nome)) {
    throw new Error('Informe em "nome" o nome exato iniciado por QAAUTO.');
  }

  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, nome };
}
