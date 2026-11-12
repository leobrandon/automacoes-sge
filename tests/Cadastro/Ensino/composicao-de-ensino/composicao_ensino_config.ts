import fs from 'node:fs';
import path from 'node:path';
import {
  FASES_ENSINO_COMPOSICAO,
  MODALIDADES_ENSINO_COMPOSICAO,
  NIVEIS_ENSINO_COMPOSICAO,
  OPCOES_SIM_NAO,
  type BuildComposicaoEnsinoOptions,
  type FaseEnsinoComposicao,
  type ModalidadeEnsinoComposicao,
  type NivelEnsinoComposicao,
  type OpcaoSimNao,
} from '../../../../src/factories/composicao-ensino.factory';

export interface ConfiguracaoCriacaoComposicaoEnsino {
  quantidade: number;
  dados: BuildComposicaoEnsinoOptions;
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
  const texto = valor.trim();
  return texto || undefined;
}

function enumOpcional<T extends string>(
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

export function lerConfiguracaoCriacaoComposicaoEnsino(): ConfiguracaoCriacaoComposicaoEnsino {
  const caminho = path.resolve(__dirname, 'dados_composicao_ensino.json');
  const config = objetoJson(caminho);
  const valorQuantidade = config.quantidade;
  const quantidade = valorQuantidade === undefined || valorQuantidade === null || valorQuantidade === ''
    ? 1
    : Number(valorQuantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1) {
    throw new Error('"quantidade" deve ser um inteiro positivo; quando omitida ou vazia, será usado 1.');
  }

  return {
    quantidade,
    dados: {
      descricao: textoOpcional(config, 'descricao'),
      abreviacao: textoOpcional(config, 'abreviacao'),
      codigoTurma: textoOpcional(config, 'codigoTurma'),
      descricaoHistorico: textoOpcional(config, 'descricaoHistorico'),
      codigoExterno: textoOpcional(config, 'codigoExterno'),
      nivelEnsino: enumOpcional<NivelEnsinoComposicao>(config, 'nivelEnsino', NIVEIS_ENSINO_COMPOSICAO),
      modalidadeEnsino: enumOpcional<ModalidadeEnsinoComposicao>(
        config,
        'modalidadeEnsino',
        MODALIDADES_ENSINO_COMPOSICAO,
      ),
      faseEnsino: enumOpcional<FaseEnsinoComposicao>(config, 'faseEnsino', FASES_ENSINO_COMPOSICAO),
      ativo: enumOpcional<OpcaoSimNao>(config, 'ativo', OPCOES_SIM_NAO),
      validarHorarioConteudoAplicado: enumOpcional<OpcaoSimNao>(
        config,
        'validarHorarioConteudoAplicado',
        OPCOES_SIM_NAO,
      ),
    },
  };
}
