import path from 'node:path';
import { buildOcorrenciaSaudeColaborador } from '../../../src/factories/ocorrencia-saude-colaborador.factory';
import { lerJsonObjeto, textoOpcional } from '../../../src/helpers/config-json.helper';

export function lerConfiguracaoOcorrenciaSaudeColaborador() {
  const config = lerJsonObjeto(path.join(__dirname, 'dados_ocorrencia_saude_colaborador.json'));
  const { totalDias } = config;
  if (totalDias !== undefined && typeof totalDias !== 'number') {
    throw new Error('"totalDias" deve ser um número no JSON.');
  }
  return buildOcorrenciaSaudeColaborador({
    escola: textoOpcional(config, 'escola') ?? '',
    colaborador: textoOpcional(config, 'colaborador') ?? '',
    justificativa: textoOpcional(config, 'justificativa') ?? '',
    dataInicio: textoOpcional(config, 'dataInicio'),
    totalDias: typeof totalDias === 'number' ? totalDias : undefined,
    motivoCancelamento: textoOpcional(config, 'motivoCancelamento'),
  });
}

export function lerConfiguracaoCancelamentoOcorrenciaSaudeColaborador() {
  const config = lerJsonObjeto(path.join(__dirname, 'dados_cancelamento_ocorrencia_saude_colaborador.json'));
  const idOcorrencia = textoOpcional(config, 'idOcorrencia');
  const dataInicio = textoOpcional(config, 'dataInicio');
  if (!idOcorrencia || !dataInicio) {
    throw new Error('Preencha "idOcorrencia" e "dataInicio" com a saída da spec de criação isolada.');
  }
  return {
    ...buildOcorrenciaSaudeColaborador({ ...lerConfiguracaoOcorrenciaSaudeColaborador(), dataInicio }),
    idOcorrencia,
  };
}
