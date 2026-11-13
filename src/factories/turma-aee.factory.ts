import { ATIVIDADES_AEE, type AtividadeAee } from './atividade-aee.factory';

export const DIAS_ATENDIMENTO_TURMA_AEE = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;

export const SITUACOES_DE_SALVAMENTO_TURMA_AEE = ['Ativo', 'Rascunho'] as const;

export type DiaAtendimentoTurmaAee = typeof DIAS_ATENDIMENTO_TURMA_AEE[number];
export type SituacaoDesejadaTurmaAee = typeof SITUACOES_DE_SALVAMENTO_TURMA_AEE[number];

export interface TurmaAeeData {
  diretoriaRegional: string;
  municipio: string;
  unidadeEducacional: string;
  calendarioEscolar: string;
  descricao: string;
  turno: string;
  horarioEntrada?: string;
  horarioSaida?: string;
  diasDeAtendimento: DiaAtendimentoTurmaAee[];
  atividadesAee: AtividadeAee[];
  situacaoDesejada: SituacaoDesejadaTurmaAee;
}

export type BuildTurmaAeeOptions = Partial<Omit<TurmaAeeData, 'descricao'>> & {
  descricao?: string;
};

function obrigatorio(valor: string | undefined, campo: string): string {
  const texto = valor?.trim();
  if (!texto) throw new Error(`Informe "${campo}" nos dados da Turma AEE.`);
  return texto;
}

function validarDias(dias: readonly string[]): DiaAtendimentoTurmaAee[] {
  if (dias.length === 0) throw new Error('Informe ao menos um dia de atendimento para a Turma AEE.');
  const invalidos = dias.filter((dia) => !DIAS_ATENDIMENTO_TURMA_AEE.includes(dia as DiaAtendimentoTurmaAee));
  if (invalidos.length > 0) {
    throw new Error(`Dia de atendimento inválido: ${invalidos.join(', ')}. Opções: ${DIAS_ATENDIMENTO_TURMA_AEE.join(', ')}.`);
  }
  if (new Set(dias).size !== dias.length) throw new Error('Não repita dias de atendimento na Turma AEE.');
  return [...dias] as DiaAtendimentoTurmaAee[];
}

function validarAtividades(atividades: readonly string[]): AtividadeAee[] {
  if (atividades.length === 0) throw new Error('Informe ao menos uma atividade de AEE para a Turma AEE.');
  const invalidas = atividades.filter((atividade) => !ATIVIDADES_AEE.includes(atividade as AtividadeAee));
  if (invalidas.length > 0) {
    throw new Error(`Atividade de AEE inválida: ${invalidas.join(', ')}.`);
  }
  if (new Set(atividades).size !== atividades.length) throw new Error('Não repita atividades na Turma AEE.');
  return [...atividades] as AtividadeAee[];
}

export function buildTurmaAee(options: BuildTurmaAeeOptions = {}, sequencia = 1): TurmaAeeData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Turma AEE deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Turma AEE Automacao';
  if (!/^QAAUTO\b/i.test(base)) throw new Error('A descrição da Turma AEE deve começar com QAAUTO.');

  const situacaoDesejada = options.situacaoDesejada ?? 'Ativo';
  if (!SITUACOES_DE_SALVAMENTO_TURMA_AEE.includes(situacaoDesejada)) {
    throw new Error(`"situacaoDesejada" deve ser uma destas opções: ${SITUACOES_DE_SALVAMENTO_TURMA_AEE.join(', ')}.`);
  }

  const diasDeAtendimento = validarDias(options.diasDeAtendimento ?? ['Segunda']);
  const atividadesAee = validarAtividades(options.atividadesAee ?? ['Desenvolvimento de funções cognitivas']);

  return {
    diretoriaRegional: obrigatorio(options.diretoriaRegional, 'diretoriaRegional'),
    municipio: obrigatorio(options.municipio, 'municipio'),
    unidadeEducacional: obrigatorio(options.unidadeEducacional, 'unidadeEducacional'),
    calendarioEscolar: obrigatorio(options.calendarioEscolar, 'calendarioEscolar'),
    descricao: `${base} ${sequencia}`,
    turno: obrigatorio(options.turno, 'turno'),
    horarioEntrada: options.horarioEntrada?.trim() || undefined,
    horarioSaida: options.horarioSaida?.trim() || undefined,
    diasDeAtendimento,
    atividadesAee,
    situacaoDesejada,
  };
}

export function isTurmaAeeQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
