export const OPCOES_CONCEITO_SIM_NAO = ['Sim', 'Não'] as const;

export type OpcaoConceitoSimNao = typeof OPCOES_CONCEITO_SIM_NAO[number];

export interface ConceitoData {
  descricao: string;
  sigla: string;
  valorMinimo: string;
  valorMaximo: string;
  aprovar: OpcaoConceitoSimNao;
  ativo: OpcaoConceitoSimNao;
}

export type BuildConceitoOptions = Partial<ConceitoData>;

export const DESCRICOES_CONCEITO = [
  'Conceito de Aprendizagem Significativa',
  'Conceito de Desenvolvimento Integral',
  'Conceito de Participação e Autonomia',
  'Conceito de Progresso Educacional',
  'Conceito de Inclusão e Aprendizagem',
  'Conceito de Desenvolvimento Socioemocional',
] as const;

function descricaoConceitoAleatoria(): string {
  const indice = Math.floor(Math.random() * DESCRICOES_CONCEITO.length);
  return DESCRICOES_CONCEITO[indice];
}

/** Monta descrição e sigla QAAUTO com numeração sequencial por lote. */
export function buildConceito(options: BuildConceitoOptions = {}, sequencia = 1): ConceitoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência do Conceito deve ser um inteiro positivo.');
  }

  const descricaoBase = options.descricao?.trim()
    || `QAAUTO ${descricaoConceitoAleatoria()}`;
  if (!/^QAAUTO\b/i.test(descricaoBase)) {
    throw new Error('A descrição do Conceito deve começar com QAAUTO.');
  }

  const siglaBase = options.sigla?.trim() || 'QAC';
  if (!/^QA[A-Z0-9-]*$/i.test(siglaBase)) {
    throw new Error('A sigla do Conceito deve começar com QA e conter somente letras, números ou hífen.');
  }

  const descricao = `${descricaoBase} ${sequencia}`;
  if (descricao.length > 500) throw new Error('A descrição do Conceito deve ter até 500 caracteres.');

  const valorMinimo = options.valorMinimo?.trim() || '';
  const valorMaximo = options.valorMaximo?.trim() || '';
  const aprovar = options.aprovar || 'Sim';
  const ativo = options.ativo || 'Sim';
  if (!OPCOES_CONCEITO_SIM_NAO.includes(aprovar)) throw new Error('A opção Aprovar deve ser "Sim" ou "Não".');
  if (!OPCOES_CONCEITO_SIM_NAO.includes(ativo)) throw new Error('A opção Ativo deve ser "Sim" ou "Não".');

  return {
    descricao,
    sigla: `${siglaBase}${sequencia}`,
    valorMinimo,
    valorMaximo,
    aprovar,
    ativo,
  };
}

/** Aceita para exclusão apenas identificadores QAAUTO numerados. */
export function isConceitoQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
import { fakeData } from '../helpers/generators/fake-data';

