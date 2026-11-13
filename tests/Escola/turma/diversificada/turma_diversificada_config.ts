import path from 'node:path';
import {
  buildTurmaDiversificada,
  MEDIACOES_TURMA_DIVERSIFICADA,
  SITUACOES_DE_SALVAMENTO_TURMA_DIVERSIFICADA,
  type BuildTurmaDiversificadaOptions,
  type MediacaoTurmaDiversificada,
  type SituacaoDesejadaTurmaDiversificada,
} from '../../../../src/factories/turma-diversificada.factory';
import {
  lerJsonObjeto,
  quantidadeConfigurada,
  textoOpcional,
  type JsonObjeto,
} from '../../../../src/helpers/config-json.helper';

export interface ConfiguracaoCriacaoTurmaDiversificada {
  quantidade: number;
  dados: BuildTurmaDiversificadaOptions;
}

function textoObrigatorio(config: JsonObjeto, campo: string): string {
  const valor = textoOpcional(config, campo);
  if (!valor) throw new Error(`Informe "${campo}" como texto em dados_turma_diversificada.json.`);
  return valor;
}

function opcao<T extends string>(config: JsonObjeto, campo: string, opcoes: readonly T[], padrao: T): T {
  const valor = textoOpcional(config, campo) ?? padrao;
  if (!opcoes.includes(valor as T)) {
    throw new Error(`"${campo}" deve ser uma destas opções: ${opcoes.join(', ')}.`);
  }
  return valor as T;
}

export function lerConfiguracaoCriacaoTurmaDiversificada(): ConfiguracaoCriacaoTurmaDiversificada {
  const config = lerJsonObjeto(path.resolve(__dirname, 'dados_turma_diversificada.json'));
  const dados: BuildTurmaDiversificadaOptions = {
    diretoriaRegional: textoObrigatorio(config, 'diretoriaRegional'),
    municipio: textoObrigatorio(config, 'municipio'),
    unidadeEducacional: textoObrigatorio(config, 'unidadeEducacional'),
    anoLetivo: textoObrigatorio(config, 'anoLetivo'),
    calendarioEscolar: textoObrigatorio(config, 'calendarioEscolar'),
    composicaoEnsino: textoObrigatorio(config, 'composicaoEnsino'),
    anoEscolar: textoObrigatorio(config, 'anoEscolar'),
    turno: textoObrigatorio(config, 'turno'),
    descricao: textoOpcional(config, 'descricao'),
    mediacaoDidaticoPedagogica: opcao<MediacaoTurmaDiversificada>(
      config, 'mediacaoDidaticoPedagogica', MEDIACOES_TURMA_DIVERSIFICADA, 'Presencial',
    ),
    localFuncionamentoDiferenciado: textoOpcional(config, 'localFuncionamentoDiferenciado'),
    situacaoDesejada: opcao<SituacaoDesejadaTurmaDiversificada>(
      config, 'situacaoDesejada', SITUACOES_DE_SALVAMENTO_TURMA_DIVERSIFICADA, 'Ativo',
    ),
  };

  buildTurmaDiversificada(dados, 1);
  return { quantidade: quantidadeConfigurada(config), dados };
}
