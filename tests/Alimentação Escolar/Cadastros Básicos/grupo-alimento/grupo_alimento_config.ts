import fs from 'node:fs';
import path from 'node:path';
import type { BuildGrupoAlimentoOptions } from '../../../../src/factories/grupo-alimento.factory';

export interface ConfiguracaoCriacaoGrupoAlimento {
  quantidade: number;
  dados: BuildGrupoAlimentoOptions;
}

export interface ConfiguracaoExclusaoGrupoAlimento {
  excluirTodosQAAUTO: boolean;
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

export function lerConfiguracaoCriacaoGrupoAlimento(): ConfiguracaoCriacaoGrupoAlimento {
  const config = objetoJson('dados_grupo_alimento.json');
  const quantidadeVazia = config.quantidade === undefined
    || config.quantidade === null
    || (typeof config.quantidade === 'string' && config.quantidade.trim() === '');
  const quantidade = quantidadeVazia ? 1 : Number(config.quantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  return {
    quantidade,
    dados: { nome: textoOpcional(config, 'nome'), descricao: textoOpcional(config, 'descricao') },
  };
}

export function lerConfiguracaoExclusaoGrupoAlimento(): ConfiguracaoExclusaoGrupoAlimento {
  const config = objetoJson('dados_exclusao_grupo_alimento.json');
  if (typeof config.excluirTodosQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodosQAAUTO" como true ou false em dados_exclusao_grupo_alimento.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const nome = textoOpcional(config, 'nome') || '';
  if (config.excluirTodosQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodosQAAUTO && nome && !/^QAAUTO\b/i.test(nome)) {
    throw new Error('Informe em "nome" o nome exato iniciado por QAAUTO.');
  }

  return { excluirTodosQAAUTO: config.excluirTodosQAAUTO, termoGeral, nome };
}
