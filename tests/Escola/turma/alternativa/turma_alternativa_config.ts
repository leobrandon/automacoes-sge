import path from 'node:path';
import {
  buildTurmaAlternativa,
  MEDIACOES_TURMA_ALTERNATIVA,
  SITUACOES_DE_SALVAMENTO_TURMA_ALTERNATIVA,
  type BuildTurmaAlternativaOptions,
  type MediacaoTurmaAlternativa,
  type SituacaoDesejadaTurmaAlternativa,
} from '../../../../src/factories/turma-alternativa.factory';
import {
  lerJsonObjeto,
  quantidadeConfigurada,
  textoOpcional,
  type JsonObjeto,
} from '../../../../src/helpers/config-json.helper';

export interface ConfiguracaoCriacaoTurmaAlternativa {
  quantidade: number;
  dados: BuildTurmaAlternativaOptions;
}

function textoObrigatorio(config: JsonObjeto, campo: string): string {
  const valor = textoOpcional(config, campo);
  if (!valor) throw new Error(`Informe "${campo}" como texto em dados_turma_alternativa.json.`);
  return valor;
}

function opcao<T extends string>(config: JsonObjeto, campo: string, opcoes: readonly T[], padrao: T): T {
  const valor = textoOpcional(config, campo) ?? padrao;
  if (!opcoes.includes(valor as T)) {
    throw new Error(`"${campo}" deve ser uma destas opções: ${opcoes.join(', ')}.`);
  }
  return valor as T;
}

export function lerConfiguracaoCriacaoTurmaAlternativa(): ConfiguracaoCriacaoTurmaAlternativa {
  const config = lerJsonObjeto(path.resolve(__dirname, 'dados_turma_alternativa.json'));
  const dados: BuildTurmaAlternativaOptions = {
    diretoriaRegional: textoObrigatorio(config, 'diretoriaRegional'),
    municipio: textoObrigatorio(config, 'municipio'),
    unidadeEducacional: textoObrigatorio(config, 'unidadeEducacional'),
    anoLetivo: textoObrigatorio(config, 'anoLetivo'),
    calendarioEscolar: textoObrigatorio(config, 'calendarioEscolar'),
    composicaoEnsino: textoObrigatorio(config, 'composicaoEnsino'),
    anoEscolar: textoObrigatorio(config, 'anoEscolar'),
    turno: textoObrigatorio(config, 'turno'),
    descricao: textoOpcional(config, 'descricao'),
    mediacaoDidaticoPedagogica: opcao<MediacaoTurmaAlternativa>(
      config, 'mediacaoDidaticoPedagogica', MEDIACOES_TURMA_ALTERNATIVA, 'Presencial',
    ),
    localFuncionamentoDiferenciado: textoOpcional(config, 'localFuncionamentoDiferenciado'),
    situacaoDesejada: opcao<SituacaoDesejadaTurmaAlternativa>(
      config, 'situacaoDesejada', SITUACOES_DE_SALVAMENTO_TURMA_ALTERNATIVA, 'Ativo',
    ),
  };

  buildTurmaAlternativa(dados, 1);
  return { quantidade: quantidadeConfigurada(config), dados };
}
