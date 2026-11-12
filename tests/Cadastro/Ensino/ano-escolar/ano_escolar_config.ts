import fs from 'node:fs';
import path from 'node:path';
import {
  isAnoEscolarQAAuto,
  OPCOES_SIM_NAO_ANO_ESCOLAR,
  TIPOS_IDADE_ANO_ESCOLAR,
  type BuildAnoEscolarOptions,
  type OpcaoSimNaoAnoEscolar,
  type TipoIdadeAnoEscolar,
} from '../../../../src/factories/ano-escolar.factory';

export interface ConfiguracaoCriacaoAnoEscolar {
  quantidade: number;
  dados: BuildAnoEscolarOptions;
}

export interface ConfiguracaoExclusaoAnoEscolar {
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  nome: string;
}

function objetoJson(caminho: string): Record<string, unknown> {
  const valor: unknown = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
  if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
    throw new Error(`${path.basename(caminho)} deve conter um objeto JSON.`);
  }
  return valor as Record<string, unknown>;
}

function textoOpcional(config: Record<string, unknown>, campo: string): string | undefined {
  const valor = config[campo];
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'string') throw new Error(`O campo "${campo}" deve ser texto.`);
  return valor.trim() || undefined;
}

function opcaoOpcional<T extends string>(
  config: Record<string, unknown>,
  campo: string,
  opcoes: readonly T[],
): T | undefined {
  const valor = textoOpcional(config, campo);
  if (!valor) return undefined;
  if (!opcoes.includes(valor as T)) {
    throw new Error(`Valor "${valor}" inválido para "${campo}". Opções: ${opcoes.join(', ')}.`);
  }
  return valor as T;
}

export function lerConfiguracaoCriacaoAnoEscolar(): ConfiguracaoCriacaoAnoEscolar {
  const config = objetoJson(path.resolve(__dirname, 'dados_ano_escolar.json'));
  const valorQuantidade = config.quantidade;
  const quantidadeVazia = valorQuantidade === undefined
    || valorQuantidade === null
    || (typeof valorQuantidade === 'string' && valorQuantidade.trim() === '');
  const quantidade = quantidadeVazia
    ? 1
    : Number(valorQuantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  return {
    quantidade,
    dados: {
      nome: textoOpcional(config, 'nome'),
      codigoTurma: textoOpcional(config, 'codigoTurma'),
      codigoExterno: textoOpcional(config, 'codigoExterno'),
      nomeCorrespondenteLei9394_96: textoOpcional(config, 'nomeCorrespondenteLei9394_96'),
      composicaoEnsino: textoOpcional(config, 'composicaoEnsino'),
      etapaEnsino: textoOpcional(config, 'etapaEnsino'),
      idadeMinima: textoOpcional(config, 'idadeMinima'),
      tipoIdade: opcaoOpcional<TipoIdadeAnoEscolar>(config, 'tipoIdade', ['', ...TIPOS_IDADE_ANO_ESCOLAR]),
      dataCompletaAte: textoOpcional(config, 'dataCompletaAte'),
      tituloHistorico: textoOpcional(config, 'tituloHistorico'),
      equivalenciaHistorico: textoOpcional(config, 'equivalenciaHistorico'),
      ativo: opcaoOpcional<OpcaoSimNaoAnoEscolar>(config, 'ativo', OPCOES_SIM_NAO_ANO_ESCOLAR),
      conclusaoEtapa: opcaoOpcional<OpcaoSimNaoAnoEscolar>(config, 'conclusaoEtapa', OPCOES_SIM_NAO_ANO_ESCOLAR),
      utilizaImpressaoCertificado: opcaoOpcional<OpcaoSimNaoAnoEscolar>(
        config,
        'utilizaImpressaoCertificado',
        OPCOES_SIM_NAO_ANO_ESCOLAR,
      ),
    },
  };
}

export function lerConfiguracaoExclusaoAnoEscolar(): ConfiguracaoExclusaoAnoEscolar {
  const config = objetoJson(path.resolve(__dirname, 'dados_exclusao_ano_escolar.json'));
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error('Defina "excluirTodasQAAUTO" como true ou false em dados_exclusao_ano_escolar.json.');
  }

  const termoGeral = textoOpcional(config, 'termoGeral') ?? 'QAAUTO';
  const nome = textoOpcional(config, 'nome') ?? '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote está limitada ao termo "QAAUTO".');
  }
  if (!config.excluirTodasQAAUTO && nome && !isAnoEscolarQAAuto(nome)) {
    throw new Error('A exclusão individual está limitada a nomes iniciados por QAAUTO.');
  }
  return { excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, nome };
}
