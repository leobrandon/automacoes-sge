import fs from 'node:fs';
import path from 'node:path';
import {
  OPCOES_ATIVO_RESTRICAO_ALIMENTAR,
  type BuildRestricaoAlimentarOptions,
  type OpcaoAtivoRestricaoAlimentar,
} from '../../../../src/factories/restricao-alimentar.factory';

export interface ConfiguracaoCriacaoRestricaoAlimentar {
  quantidade: number;
  dados: BuildRestricaoAlimentarOptions;
}

export interface ConfiguracaoExclusaoRestricaoAlimentar {
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

export function lerConfiguracaoCriacaoRestricaoAlimentar(): ConfiguracaoCriacaoRestricaoAlimentar {
  const config = objetoJson('dados_restricao_alimentar.json');
  const quantidadeVazia = config.quantidade === undefined
    || config.quantidade === null
    || (typeof config.quantidade === 'string' && config.quantidade.trim() === '');
  const quantidade = quantidadeVazia ? 1 : Number(config.quantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  const ativo = textoOpcional(config, 'ativo');
  if (ativo && !OPCOES_ATIVO_RESTRICAO_ALIMENTAR.includes(ativo as OpcaoAtivoRestricaoAlimentar)) {
    throw new Error(`Valor "${ativo}" inválido para "ativo". Opções: ${OPCOES_ATIVO_RESTRICAO_ALIMENTAR.join(', ')}.`);
  }

  return {
    quantidade,
    dados: { descricao: textoOpcional(config, 'descricao'), ativo: ativo as OpcaoAtivoRestricaoAlimentar | undefined },
  };
}

export function lerConfiguracaoExclusaoRestricaoAlimentar(): ConfiguracaoExclusaoRestricaoAlimentar {
  const config = objetoJson('dados_exclusao_restricao_alimentar.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_restricao_alimentar.json.');
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
