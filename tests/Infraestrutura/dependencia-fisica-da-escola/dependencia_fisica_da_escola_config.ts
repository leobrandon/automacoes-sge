import fs from 'node:fs';
import path from 'node:path';
import type { BuildDependenciaFisicaDaEscolaOptions } from '../../../src/factories/dependencia-fisica-da-escola.factory';

export interface ConfiguracaoCriacaoDependenciaFisicaDaEscola {
  quantidade: number;
  dados: BuildDependenciaFisicaDaEscolaOptions;
}

export interface ConfiguracaoExclusaoDependenciaFisicaDaEscola {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  dependenciaFisica: string;
  escola: string;
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

export function lerConfiguracaoCriacaoDependenciaFisicaDaEscola(): ConfiguracaoCriacaoDependenciaFisicaDaEscola {
  const config = objetoJson('dados_dependencia_fisica_da_escola.json');
  const quantidade = inteiroOpcional(config, 'quantidade') ?? 1;
  if (quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  return {
    quantidade,
    dados: {
      escola: textoOpcional(config, 'escola'),
      dependenciaFisica: textoOpcional(config, 'dependenciaFisica'),
      tipoConstrucao: textoOpcional(config, 'tipoConstrucao'),
      condicaoUso: textoOpcional(config, 'condicaoUso'),
      quantidadeDependencia: inteiroOpcional(config, 'quantidadeDependencia'),
    },
  };
}

export function lerConfiguracaoExclusaoDependenciaFisicaDaEscola(): ConfiguracaoExclusaoDependenciaFisicaDaEscola {
  const config = objetoJson('dados_exclusao_dependencia_fisica_da_escola.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error(
      'Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_dependencia_fisica_da_escola.json.',
    );
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const dependenciaFisica = textoOpcional(config, 'dependenciaFisica') || '';
  const escola = textoOpcional(config, 'escola') || '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO) {
    if (!/^QAAUTO\b/i.test(dependenciaFisica)) {
      throw new Error('Informe em "dependenciaFisica" a descrição exata iniciada por QAAUTO.');
    }
    if (!escola) throw new Error('Informe em "escola" o nome da escola do vínculo a excluir.');
  }

  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, dependenciaFisica, escola };
}
