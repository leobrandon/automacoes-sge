import path from 'node:path';
import {
  ENVOLVIMENTOS_OCORRENCIA,
  type EnvolvimentoOcorrencia,
  type OcorrenciaEscolarData,
} from '../../../../src/factories/ocorrencia-escolar.factory';
import { lerJsonObjeto, quantidadeConfigurada, textoOpcional } from '../../../../src/helpers/config-json.helper';

export interface ConfiguracaoCriacaoOcorrenciaEscolar {
  quantidade: number;
  escola: string;
  dados: OcorrenciaEscolarData;
}

function textoObrigatorio(config: Record<string, unknown>, chave: string, arquivo: string): string {
  const valor = textoOpcional(config, chave);
  if (!valor) throw new Error(`${arquivo}: informe "${chave}" (dado de apoio do tenant).`);
  return valor;
}

export function lerConfiguracaoCriacaoOcorrenciaEscolar(): ConfiguracaoCriacaoOcorrenciaEscolar {
  const arquivo = 'dados_ocorrencia_escolar.json';
  const config = lerJsonObjeto(path.resolve(__dirname, arquivo));

  const brutos = config.envolvidos;
  if (!Array.isArray(brutos) || brutos.length === 0) {
    throw new Error(`${arquivo}: "envolvidos" deve listar ao menos um aluno.`);
  }
  const envolvidos = (brutos as unknown[]).map((item) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      throw new Error(`${arquivo}: cada envolvido deve ser um objeto.`);
    }
    const envolvido = item as Record<string, unknown>;
    const envolvimento = textoObrigatorio(envolvido, 'envolvimento', arquivo);
    if (!ENVOLVIMENTOS_OCORRENCIA.includes(envolvimento as EnvolvimentoOcorrencia)) {
      throw new Error(`${arquivo}: envolvimento inválido "${envolvimento}". Opções: ${ENVOLVIMENTOS_OCORRENCIA.join(', ')}.`);
    }
    return {
      envolvimento: envolvimento as EnvolvimentoOcorrencia,
      busca: textoObrigatorio(envolvido, 'busca', arquivo),
      matricula: textoObrigatorio(envolvido, 'matricula', arquivo),
    };
  });

  const dataOcorrencia = textoOpcional(config, 'dataOcorrencia');
  if (dataOcorrencia && !/^\d{2}\/\d{2}\/\d{4}$/.test(dataOcorrencia)) {
    throw new Error(`${arquivo}: "dataOcorrencia" deve estar em DD/MM/AAAA.`);
  }

  return {
    quantidade: quantidadeConfigurada(config),
    escola: textoObrigatorio(config, 'escola', arquivo),
    dados: {
      tipo: textoObrigatorio(config, 'tipo', arquivo),
      natureza: textoObrigatorio(config, 'natureza', arquivo),
      turno: textoOpcional(config, 'turno'),
      dataOcorrencia,
      descricao: textoOpcional(config, 'descricao'),
      procedimento: textoOpcional(config, 'procedimento'),
      envolvidos,
    },
  };
}

export interface ConfiguracaoExclusaoOcorrenciaEscolar {
  escola: string;
  excluirTodasQAAUTO: boolean;
  termoGeral: string;
  numero: string;
}

export function lerConfiguracaoExclusaoOcorrenciaEscolar(): ConfiguracaoExclusaoOcorrenciaEscolar {
  const arquivo = 'dados_exclusao_ocorrencia_escolar.json';
  const config = lerJsonObjeto(path.resolve(__dirname, arquivo));
  if (typeof config.excluirTodasQAAUTO !== 'boolean') {
    throw new Error(`${arquivo}: defina 'excluirTodasQAAUTO' como true ou false.`);
  }
  const termoGeral = textoOpcional(config, 'termoGeral') ?? 'QAAUTO';
  const numero = textoOpcional(config, 'numero') ?? '';
  if (config.excluirTodasQAAUTO && termoGeral.toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error(`${arquivo}: a limpeza em lote está limitada ao termo 'QAAUTO'.`);
  }
  if (!config.excluirTodasQAAUTO && !/^\d+$/.test(numero)) {
    throw new Error(`${arquivo}: informe 'numero' (só dígitos) para excluir uma ocorrência específica.`);
  }
  return { escola: textoObrigatorio(config, 'escola', arquivo), excluirTodasQAAUTO: config.excluirTodasQAAUTO, termoGeral, numero };
}
