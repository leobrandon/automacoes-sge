import fs from 'node:fs';
import path from 'node:path';
import {
  CLIMATIZACOES_SALA_DE_AULA,
  type BuildSalaDeAulaOptions,
  type ClimatizacaoSalaDeAula,
} from '../../../src/factories/sala-de-aula.factory';

export interface ConfiguracaoCriacaoSalaDeAula {
  quantidade: number;
  dados: BuildSalaDeAulaOptions;
}

export interface ConfiguracaoExclusaoSalaDeAula {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  descricao: string;
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

function numeroOpcional(config: Record<string, unknown>, campo: string): number | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) return undefined;
  const numero = Number(typeof valor === 'string' ? valor.replace(',', '.') : valor);
  if (!Number.isFinite(numero) || numero < 0) throw new Error(`O campo "${campo}" deve ser um número não negativo.`);
  return numero;
}

function inteiroOpcional(config: Record<string, unknown>, campo: string): number | undefined {
  const numero = numeroOpcional(config, campo);
  if (numero !== undefined && !Number.isSafeInteger(numero)) throw new Error(`O campo "${campo}" deve ser inteiro.`);
  return numero;
}

function climatizacaoOpcional(config: Record<string, unknown>): ClimatizacaoSalaDeAula[] | undefined {
  const valor = config.climatizacao;
  if (valor === undefined || valor === null || valor === '') return undefined;
  const lista = Array.isArray(valor) ? valor : [valor];
  if (lista.length === 0) return undefined;
  return lista.map((item) => {
    if (typeof item !== 'string' || !CLIMATIZACOES_SALA_DE_AULA.includes(item as ClimatizacaoSalaDeAula)) {
      throw new Error(`Climatização "${String(item)}" inválida. Opções: ${CLIMATIZACOES_SALA_DE_AULA.join(', ')}.`);
    }
    return item as ClimatizacaoSalaDeAula;
  });
}

export function lerConfiguracaoCriacaoSalaDeAula(): ConfiguracaoCriacaoSalaDeAula {
  const config = objetoJson('dados_sala_de_aula.json');
  const quantidade = inteiroOpcional(config, 'quantidade') ?? 1;
  if (quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  return {
    quantidade,
    dados: {
      escola: textoOpcional(config, 'escola'),
      descricao: textoOpcional(config, 'descricao'),
      climatizacao: climatizacaoOpcional(config),
      quantidadeAresCondicionados: inteiroOpcional(config, 'quantidadeAresCondicionados'),
      numeroSala: inteiroOpcional(config, 'numeroSala'),
      capacidadeAlunos: inteiroOpcional(config, 'capacidadeAlunos'),
      largura: numeroOpcional(config, 'largura'),
      comprimento: numeroOpcional(config, 'comprimento'),
      peDireito: numeroOpcional(config, 'peDireito'),
      area: numeroOpcional(config, 'area'),
      volume: numeroOpcional(config, 'volume'),
      larguraPorta: inteiroOpcional(config, 'larguraPorta'),
      numeroJanelas: inteiroOpcional(config, 'numeroJanelas'),
    },
  };
}

export function lerConfiguracaoExclusaoSalaDeAula(): ConfiguracaoExclusaoSalaDeAula {
  const config = objetoJson('dados_exclusao_sala_de_aula.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_sala_de_aula.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const descricao = textoOpcional(config, 'descricao') || '';
  const escola = textoOpcional(config, 'escola') || '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO) {
    if (!/^QAAUTO\b/i.test(descricao)) throw new Error('Informe em "descricao" o nome exato iniciado por QAAUTO.');
    if (!escola) throw new Error('Informe em "escola" o nome da escola da sala a excluir.');
  }

  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, descricao, escola };
}
