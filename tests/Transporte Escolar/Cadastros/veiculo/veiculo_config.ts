import fs from 'node:fs';
import path from 'node:path';
import { TIPOS_VEICULO_RODOVIARIO, type BuildVeiculoOptions } from '../../../../src/factories/veiculo.factory';

export interface ConfiguracaoCriacaoVeiculo {
  quantidade: number;
  dados: BuildVeiculoOptions;
}

export interface ConfiguracaoExclusaoVeiculo {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  modelo: string;
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

export function lerConfiguracaoCriacaoVeiculo(): ConfiguracaoCriacaoVeiculo {
  const config = objetoJson('dados_veiculo.json');
  const quantidade = inteiroOpcional(config, 'quantidade') ?? 1;
  if (quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  const tipo = textoOpcional(config, 'tipo');
  if (tipo !== undefined && !(TIPOS_VEICULO_RODOVIARIO as readonly string[]).includes(tipo)) {
    throw new Error(`"tipo" deve ser um de: ${TIPOS_VEICULO_RODOVIARIO.join(' | ')}.`);
  }

  return {
    quantidade,
    dados: {
      modelo: textoOpcional(config, 'modelo'),
      tipo: tipo as BuildVeiculoOptions['tipo'],
      ano: inteiroOpcional(config, 'ano'),
      capacidade: inteiroOpcional(config, 'capacidade'),
    },
  };
}

export function lerConfiguracaoExclusaoVeiculo(): ConfiguracaoExclusaoVeiculo {
  const config = objetoJson('dados_exclusao_veiculo.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_veiculo.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const modelo = textoOpcional(config, 'modelo') || '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO && !/^QAAUTO\b/i.test(modelo)) {
    throw new Error('Informe em "modelo" o nome exato iniciado por QAAUTO.');
  }

  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, modelo };
}
