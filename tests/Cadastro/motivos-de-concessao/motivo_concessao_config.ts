import fs from 'node:fs';
import path from 'node:path';
import type { BuildMotivoConcessaoOptions } from '../../../src/factories/motivo-concessao.factory';

export interface ConfiguracaoCriacaoMotivoConcessao {
  quantidade: number;
  dados: BuildMotivoConcessaoOptions;
}

export interface ConfiguracaoInativacaoMotivoConcessao {
  inativarTodosQAAUTO: boolean;
  termoGeral: string;
  titulo: string;
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

export function lerConfiguracaoCriacaoMotivoConcessao(): ConfiguracaoCriacaoMotivoConcessao {
  const config = objetoJson('dados_motivo_concessao.json');
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
      titulo: textoOpcional(config, 'titulo'),
      descricao: textoOpcional(config, 'descricao'),
      entregaDefinitiva: booleanoOpcional(config, 'entregaDefinitiva'),
    },
  };
}

export function lerConfiguracaoInativacaoMotivoConcessao(): ConfiguracaoInativacaoMotivoConcessao {
  const config = objetoJson('dados_inativacao_motivo_concessao.json');
  if (typeof config.inativarTodosQAAUTO !== 'boolean') {
    throw new Error('Defina "inativarTodosQAAUTO" como true ou false em dados_inativacao_motivo_concessao.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const titulo = textoOpcional(config, 'titulo') || '';
  if (config.inativarTodosQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A inativação em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.inativarTodosQAAUTO && !/^QAAUTO\b/i.test(titulo)) {
    throw new Error('Informe em "titulo" o nome exato iniciado por QAAUTO.');
  }

  return { inativarTodosQAAUTO: config.inativarTodosQAAUTO, termoGeral, titulo };
}
