import fs from 'node:fs';
import path from 'node:path';
import type { BuildPermissaoPontoOptions } from '../../../../src/factories/permissao-ponto.factory';

export interface ConfiguracaoCriacaoPermissaoPonto {
  quantidade: number;
  dados: BuildPermissaoPontoOptions;
}

export interface ConfiguracaoInativacaoPermissaoPonto {
  inativarTodasQAAUTO: boolean;
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

export function lerConfiguracaoCriacaoPermissaoPonto(): ConfiguracaoCriacaoPermissaoPonto {
  const config = objetoJson('dados_permissao_ponto.json');
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
      acessoPreFolha: booleanoOpcional(config, 'acessoPreFolha'),
      inserirJustificativaPreFolha: booleanoOpcional(config, 'inserirJustificativaPreFolha'),
      permitirRegistroManual: booleanoOpcional(config, 'permitirRegistroManual'),
      registrarPontoViaAplicativo: booleanoOpcional(config, 'registrarPontoViaAplicativo'),
      permitirRegistrarForaDoRaio: booleanoOpcional(config, 'permitirRegistrarForaDoRaio'),
    },
  };
}

export function lerConfiguracaoInativacaoPermissaoPonto(): ConfiguracaoInativacaoPermissaoPonto {
  const config = objetoJson('dados_inativacao_permissao_ponto.json');
  if (typeof config.inativarTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "inativarTodasQAAUTO" como true ou false em dados_inativacao_permissao_ponto.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const descricao = textoOpcional(config, 'descricao') || '';
  if (config.inativarTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A inativação em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.inativarTodasQAAUTO && !/^QAAUTO\b/i.test(descricao)) {
    throw new Error('Informe em "descricao" o nome exato iniciado por QAAUTO.');
  }

  return { inativarTodasQAAUTO: config.inativarTodasQAAUTO, termoGeral, descricao };
}
