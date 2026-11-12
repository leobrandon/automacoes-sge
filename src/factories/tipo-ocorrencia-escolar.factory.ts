export const OPCOES_CAMPO_OCORRENCIA = ['Não', 'Sim', 'Sim e Obrigatório'] as const;
export type OpcaoCampoOcorrencia = typeof OPCOES_CAMPO_OCORRENCIA[number];

export const OPCOES_SIM_NAO = ['Sim', 'Não'] as const;
export type OpcaoSimNao = typeof OPCOES_SIM_NAO[number];

export interface TipoOcorrenciaEscolarParametrizacao {
  naturezaOcorrencia: OpcaoCampoOcorrencia;
  dataOcorrencia: OpcaoCampoOcorrencia;
  turnoOcorrencia: OpcaoCampoOcorrencia;
  horaOcorrencia: OpcaoCampoOcorrencia;
  descricaoOcorrencia: OpcaoCampoOcorrencia;
  procedimentoAdotado: OpcaoCampoOcorrencia;
  informarEnvolvidos: OpcaoCampoOcorrencia;
}

export interface TipoOcorrenciaEscolarDadosEnvolvidos {
  aluno: OpcaoSimNao;
  responsavelDoAluno: OpcaoSimNao;
  servidor: OpcaoSimNao;
  outro: OpcaoSimNao;
}

export interface TipoOcorrenciaEscolarData {
  descricao: string;
  ativo: OpcaoSimNao;
  parametrizacao: TipoOcorrenciaEscolarParametrizacao;
  dadosEnvolvidos: TipoOcorrenciaEscolarDadosEnvolvidos;
}

export type TipoOcorrenciaEscolarNomeado = TipoOcorrenciaEscolarData & {
  sequencia: number;
};

export type TipoOcorrenciaEscolarCriado = TipoOcorrenciaEscolarNomeado & {
  url: string;
};

const DESCRICAO_MAXIMA = 100;

/** Gera uma descrição de execução estável sem alterar os dados recebidos. */
export function buildTipoOcorrenciaEscolar(
  dados: TipoOcorrenciaEscolarData,
  sequencia = 1,
): TipoOcorrenciaEscolarNomeado {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência do Tipo de Ocorrência Escolar deve ser um inteiro positivo.');
  }

  const base = dados.descricao.trim();
  if (!/^QAAUTO\s+\S/i.test(base)) {
    throw new Error('A descrição do Tipo de Ocorrência Escolar deve começar com "QAAUTO" e conter um nome.');
  }

  const descricao = `${base} ${sequencia}`;
  if (descricao.length > DESCRICAO_MAXIMA) {
    throw new Error(`A descrição do Tipo de Ocorrência Escolar não pode ultrapassar ${DESCRICAO_MAXIMA} caracteres.`);
  }

  return { ...dados, descricao, sequencia };
}

/** Aceita somente descrições QAAUTO com sequência numérica final positiva. */
export function isTipoOcorrenciaEscolarQAAuto(descricao: string): boolean {
  return /^QAAUTO\s+.+\s+[1-9]\d*$/i.test(descricao.trim());
}
