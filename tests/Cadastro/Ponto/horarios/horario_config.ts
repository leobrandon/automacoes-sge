import fs from 'node:fs';
import path from 'node:path';
import type { BuildHorarioOptions } from '../../../../src/factories/horario.factory';

export interface ConfiguracaoCriacaoHorario {
  quantidade: number;
  dados: BuildHorarioOptions;
}

export interface ConfiguracaoExclusaoHorario {
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

/** Objetos aninhados (jornada, horasExtras, colunas) são validados em detalhe pela factory. */
function objetoOpcional<T>(config: Record<string, unknown>, campo: string): T | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'object' || Array.isArray(valor)) throw new Error(`O campo "${campo}" deve ser um objeto.`);
  return valor as T;
}

export function lerConfiguracaoCriacaoHorario(): ConfiguracaoCriacaoHorario {
  const config = objetoJson('dados_horario.json');
  const quantidadeVazia = config.quantidade === undefined
    || config.quantidade === null
    || (typeof config.quantidade === 'string' && config.quantidade.trim() === '');
  const quantidade = quantidadeVazia ? 1 : Number(config.quantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  const cargaFixa = config.cargaHorariaFixaEmHoras;
  if (cargaFixa !== undefined && cargaFixa !== null && cargaFixa !== '' && typeof cargaFixa !== 'string' && typeof cargaFixa !== 'number') {
    throw new Error('O campo "cargaHorariaFixaEmHoras" deve ser texto ou número.');
  }

  return {
    quantidade,
    dados: {
      descricao: textoOpcional(config, 'descricao'),
      tipo: textoOpcional(config, 'tipo'),
      colunaRefeicao: textoOpcional(config, 'colunaRefeicao'),
      cargaHorariaFixaEmHoras: cargaFixa === undefined || cargaFixa === null || cargaFixa === '' ? undefined : String(cargaFixa),
      horarioFechamentoNoturno: textoOpcional(config, 'horarioFechamentoNoturno'),
      horario24Horas: booleanoOpcional(config, 'horario24Horas'),
      habilitarBatidasPreAssinaladas: booleanoOpcional(config, 'habilitarBatidasPreAssinaladas'),
      preencherFolgaEmBranco: booleanoOpcional(config, 'preencherFolgaEmBranco'),
      bancoDeHoras: booleanoOpcional(config, 'bancoDeHoras'),
      horaExtra: booleanoOpcional(config, 'horaExtra'),
      adicionalNoturno: booleanoOpcional(config, 'adicionalNoturno'),
      exibirHoraDiurnaReduzida: booleanoOpcional(config, 'exibirHoraDiurnaReduzida'),
      horaDiurnaReduzida: textoOpcional(config, 'horaDiurnaReduzida'),
      exibirHoraNoturnaReduzida: booleanoOpcional(config, 'exibirHoraNoturnaReduzida'),
      horaNoturnaReduzida: textoOpcional(config, 'horaNoturnaReduzida'),
      jornada: objetoOpcional(config, 'jornada'),
      horasExtras: objetoOpcional(config, 'horasExtras'),
      colunas: objetoOpcional(config, 'colunas'),
    },
  };
}

export function lerConfiguracaoExclusaoHorario(): ConfiguracaoExclusaoHorario {
  const config = objetoJson('dados_exclusao_horario.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_horario.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') || 'QAAUTO';
  const descricao = textoOpcional(config, 'descricao') || '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO && !descricao) {
    throw new Error('Informe em "descricao" o nome exato do Horário QAAUTO a excluir, ou use "excluirTodasQAAUTO": true.');
  }
  if (!config.excluirTodasQAAUTO && !/^QAAUTO\b/i.test(descricao)) {
    throw new Error('Informe em "descricao" o nome exato iniciado por QAAUTO.');
  }

  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, descricao };
}
