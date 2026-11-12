import fs from 'node:fs';
import path from 'node:path';
import {
  OPCOES_CONCEITO_SIM_NAO,
  type BuildConceitoOptions,
  type OpcaoConceitoSimNao,
} from '../../../../src/factories/conceito.factory';

export interface ConfiguracaoCriacaoConceito {
  quantidade: number;
  dados: BuildConceitoOptions;
}

export interface ConfiguracaoExclusaoConceito {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  descricao: string;
}

function lerObjetoJson(nome: string): Record<string, unknown> {
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

function opcaoSimNao(config: Record<string, unknown>, campo: string): OpcaoConceitoSimNao | undefined {
  const valor = textoOpcional(config, campo);
  if (!valor) return undefined;
  if (!OPCOES_CONCEITO_SIM_NAO.includes(valor as OpcaoConceitoSimNao)) {
    throw new Error(`O campo "${campo}" deve ser "Sim" ou "Não".`);
  }
  return valor as OpcaoConceitoSimNao;
}

export function lerConfiguracaoCriacaoConceito(nomeArquivo = 'dados_conceito.json'): ConfiguracaoCriacaoConceito {
  const config = lerObjetoJson(nomeArquivo);
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
      sigla: textoOpcional(config, 'sigla'),
      valorMinimo: textoOpcional(config, 'valorMinimo'),
      valorMaximo: textoOpcional(config, 'valorMaximo'),
      aprovar: opcaoSimNao(config, 'aprovar'),
      ativo: opcaoSimNao(config, 'ativo'),
    },
  };
}

export function lerConfiguracaoExclusaoConceito(): ConfiguracaoExclusaoConceito {
  const config = lerObjetoJson('dados_exclusao_conceito.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false.');
  }
  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote de Conceitos aceita somente o termo "QAAUTO".');
  }
  const descricao = textoOpcional(config, 'descricao') || '';
  if (descricao && !/^QAAUTO\b/i.test(descricao)) {
    throw new Error('Informe em "descricao" o nome exato iniciado por QAAUTO.');
  }
  if (!config.excluirTodasQAAUTO && !descricao) {
    throw new Error('Informe a descrição QAAUTO exata ou habilite "excluirTodasQAAUTO".');
  }
  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, descricao };
}
