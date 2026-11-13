import fs from 'node:fs';
import path from 'node:path';
import {
  DIAS_ATENDIMENTO_TURMA_AEE,
  SITUACOES_DE_SALVAMENTO_TURMA_AEE,
  buildTurmaAee,
  type BuildTurmaAeeOptions,
  type DiaAtendimentoTurmaAee,
  type SituacaoDesejadaTurmaAee,
} from '../../../src/factories/turma-aee.factory';
import { ATIVIDADES_AEE, type AtividadeAee } from '../../../src/factories/atividade-aee.factory';

export interface ConfiguracaoCriacaoTurmaAee {
  quantidade: number;
  dados: BuildTurmaAeeOptions;
}

function objetoJson(nome: string): Record<string, unknown> {
  const caminho = path.resolve(__dirname, nome);
  const valor: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new Error(`${nome} deve conter um objeto JSON.`);
  }
  return valor as Record<string, unknown>;
}

function textoObrigatorio(config: Record<string, unknown>, campo: string): string {
  const valor = config[campo];
  if (typeof valor !== 'string' || !valor.trim()) throw new Error(`Informe "${campo}" como texto em dados_turma_aee.json.`);
  return valor.trim();
}

function textoOpcional(config: Record<string, unknown>, campo: string): string | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'string') throw new Error(`O campo "${campo}" deve ser texto.`);
  return valor.trim() || undefined;
}

function listaEnum<T extends string>(
  config: Record<string, unknown>,
  campo: string,
  opcoes: readonly T[],
): T[] {
  const valor = config[campo];
  if (!Array.isArray(valor) || valor.length === 0 || valor.some((item) => typeof item !== 'string')) {
    throw new Error(`"${campo}" deve conter uma lista não vazia de textos.`);
  }
  const invalidos = (valor as string[]).filter((item) => !opcoes.includes(item as T));
  if (invalidos.length > 0) throw new Error(`Opções inválidas em "${campo}": ${invalidos.join(', ')}.`);
  return [...valor] as T[];
}

export function lerConfiguracaoCriacaoTurmaAee(): ConfiguracaoCriacaoTurmaAee {
  const config = objetoJson('dados_turma_aee.json');
  const quantidadeVazia = config.quantidade === undefined
    || config.quantidade === null
    || (typeof config.quantidade === 'string' && config.quantidade.trim() === '');
  const quantidade = quantidadeVazia ? 1 : Number(config.quantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  const situacao = textoOpcional(config, 'situacaoDesejada') ?? 'Ativo';
  if (!SITUACOES_DE_SALVAMENTO_TURMA_AEE.includes(situacao as SituacaoDesejadaTurmaAee)) {
    throw new Error(`"situacaoDesejada" deve ser uma destas opções: ${SITUACOES_DE_SALVAMENTO_TURMA_AEE.join(', ')}.`);
  }

  const dados: BuildTurmaAeeOptions = {
    diretoriaRegional: textoObrigatorio(config, 'diretoriaRegional'),
    municipio: textoObrigatorio(config, 'municipio'),
    unidadeEducacional: textoObrigatorio(config, 'unidadeEducacional'),
    calendarioEscolar: textoObrigatorio(config, 'calendarioEscolar'),
    descricao: textoOpcional(config, 'descricao'),
    turno: textoObrigatorio(config, 'turno'),
    horarioEntrada: textoOpcional(config, 'horarioEntrada'),
    horarioSaida: textoOpcional(config, 'horarioSaida'),
    diasDeAtendimento: listaEnum<DiaAtendimentoTurmaAee>(config, 'diasDeAtendimento', DIAS_ATENDIMENTO_TURMA_AEE),
    atividadesAee: listaEnum<AtividadeAee>(config, 'atividadesAee', ATIVIDADES_AEE),
    situacaoDesejada: situacao as SituacaoDesejadaTurmaAee,
  };

  buildTurmaAee(dados, 1);
  return { quantidade, dados };
}
