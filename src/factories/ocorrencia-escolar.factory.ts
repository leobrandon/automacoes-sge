export const ENVOLVIMENTOS_OCORRENCIA = [
  'Envolvido principal',
  'Cúmplice',
  'Vítima',
  'Testemunha',
  'Interventor',
  'Responsável pelo envolvido principal',
] as const;
export type EnvolvimentoOcorrencia = (typeof ENVOLVIMENTOS_OCORRENCIA)[number];

export interface EnvolvidoOcorrenciaEscolar {
  envolvimento: EnvolvimentoOcorrencia;
  /** Parte do nome usada na busca do Aluno (ex.: "QAAUTO"). */
  busca: string;
  /** Matrícula que identifica o aluno na lista de resultados. */
  matricula: string;
}

export interface OcorrenciaEscolarData {
  tipo: string;
  natureza: string;
  turno?: string;
  /** DD/MM/AAAA; vazio = hoje. */
  dataOcorrencia?: string;
  descricao?: string;
  procedimento?: string;
  envolvidos: EnvolvidoOcorrenciaEscolar[];
}

export interface OcorrenciaEscolarCriada {
  numero: string;
  descricao: string;
  procedimento: string;
  dataOcorrencia: string;
  tipo: string;
  natureza: string;
}

export function dataDeHoje(agora: Date = new Date()): string {
  const dia = String(agora.getDate()).padStart(2, '0');
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${agora.getFullYear()}`;
}

export function descricaoOcorrenciaEscolar(sequencia: number): string {
  return `QAAUTO Ocorrência Escolar ${sequencia}`;
}

export function isOcorrenciaEscolarQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}

export function buildOcorrenciaEscolar(
  dados: OcorrenciaEscolarData,
  sequencia: number,
): Omit<OcorrenciaEscolarCriada, 'numero'> {
  return {
    tipo: dados.tipo,
    natureza: dados.natureza,
    dataOcorrencia: dados.dataOcorrencia || dataDeHoje(),
    descricao: dados.descricao || descricaoOcorrenciaEscolar(sequencia),
    procedimento: dados.procedimento || `QAAUTO procedimento adotado ${sequencia}`,
  };
}
