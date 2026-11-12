import fs from 'node:fs';
import path from 'node:path';
import {
  isDocumentoCurricularQAAuto,
  type BuildDocumentoCurricularOptions,
} from '../../../../src/factories/documento-curricular.factory';

function lerObjeto(nome: string): Record<string, unknown> {
  const valor: unknown = JSON.parse(fs.readFileSync(path.resolve(__dirname, nome), 'utf8'));
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error(`${nome} deve conter um objeto JSON.`);
  return valor as Record<string, unknown>;
}

function texto(config: Record<string, unknown>, campo: string): string | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'string') throw new Error(`O campo "${campo}" deve ser texto.`);
  return valor.trim() || undefined;
}

function quantidade(valor: unknown): number {
  const resultado = valor === undefined || valor === null || valor === '' ? 1 : Number(valor);
  if (!Number.isSafeInteger(resultado) || resultado < 1) throw new Error('"quantidade" deve ser um inteiro positivo.');
  return resultado;
}

export interface ConfiguracaoCriacaoDocumentoCurricular {
  quantidade: number;
  dados: BuildDocumentoCurricularOptions;
}

export interface ConfiguracaoExclusaoDocumentoCurricular {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  descricao: string;
}

export function lerConfiguracaoCriacaoDocumentoCurricular(): ConfiguracaoCriacaoDocumentoCurricular {
  const config = lerObjeto('dados_documento_curricular.json');
  if (config.componentes !== undefined && (!Array.isArray(config.componentes)
    || config.componentes.some(valor => typeof valor !== 'string'))) {
    throw new Error('O campo "componentes" deve ser uma lista de nomes.');
  }
  const dados = {
    descricao: texto(config, 'descricao'),
    composicaoEnsino: texto(config, 'composicaoEnsino'),
    anoEscolar: texto(config, 'anoEscolar'),
    componente: texto(config, 'componente'),
    componentes: config.componentes as string[] | undefined,
    componenteAlternativo: texto(config, 'componenteAlternativo'),
    ativo: texto(config, 'ativo') as BuildDocumentoCurricularOptions['ativo'],
    estruturas: config.estruturas as BuildDocumentoCurricularOptions['estruturas'] | undefined,
  };
  if (dados.descricao && !isDocumentoCurricularQAAuto(dados.descricao)) {
    throw new Error('A descrição deve começar com QAAUTO.');
  }
  return { quantidade: quantidade(config.quantidade), dados };
}

export function lerConfiguracaoExclusaoDocumentoCurricular(): ConfiguracaoExclusaoDocumentoCurricular {
  const config = lerObjeto('dados_exclusao_documento_curricular.json');
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false no JSON.');
  }
  const termoGeral = texto(config, 'termoGeral') ?? 'QAAUTO';
  const descricao = texto(config, 'descricao') ?? '';
  if (termoGeral.toUpperCase() !== 'QAAUTO') throw new Error('A exclusão em lote está limitada ao termo QAAUTO.');
  if (!config.excluirTodasQAAUTO && descricao && !isDocumentoCurricularQAAuto(descricao)) {
    throw new Error('A exclusão individual está limitada a descrições iniciadas por QAAUTO.');
  }
  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, descricao };
}
