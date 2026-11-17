export interface OpcoesOcorrenciaSaudeColaborador {
  escola: string;
  colaborador: string;
  justificativa: string;
  dataInicio?: string;
  totalDias?: number;
  motivoCancelamento?: string;
}

export const COLABORADOR_OCORRENCIA_QAAUTO = /\bQAAUTO\b/i;

export function validarMotivoCancelamentoOcorrenciaSaude(motivo: string): string {
  const texto = motivo.trim();
  if (!/^QAAUTO\b/i.test(texto) || texto.length > 500) {
    throw new Error('O motivo de cancelamento deve começar com QAAUTO e ter até 500 caracteres.');
  }
  return texto;
}

export function buildOcorrenciaSaudeColaborador(
  opcoes: OpcoesOcorrenciaSaudeColaborador,
  hoje = new Date(),
): Required<OpcoesOcorrenciaSaudeColaborador> {
  const escola = opcoes.escola.trim();
  const colaborador = opcoes.colaborador.trim();
  const justificativa = opcoes.justificativa.trim();
  if (!escola || !justificativa) throw new Error('Informe a escola e a justificativa no JSON.');
  if (!COLABORADOR_OCORRENCIA_QAAUTO.test(colaborador)) throw new Error('Informe um colaborador de teste QAAUTO no JSON.');

  const dataAtual = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(hoje);
  const dataInicio = opcoes.dataInicio?.trim() || dataAtual;
  const [dia, mes, ano] = dataInicio.split('/');
  const dataIso = `${ano}-${mes}-${dia}`;
  const data = new Date(`${dataIso}T00:00:00Z`);
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataInicio) || !Number.isFinite(data.getTime()) ||
      data.toISOString().slice(0, 10) !== dataIso || Number(ano) < Number(dataAtual.slice(-4))) {
    throw new Error('Informe uma data válida em DD/MM/AAAA. São aceitas datas do ano corrente ou de anos posteriores.');
  }

  const totalDias = opcoes.totalDias ?? 1;
  if (!Number.isSafeInteger(totalDias) || totalDias < 0 || totalDias > 999) {
    throw new Error('"totalDias" deve ser um inteiro de 0 a 999, inclusive.');
  }

  const motivoCancelamento = validarMotivoCancelamentoOcorrenciaSaude(
    opcoes.motivoCancelamento?.trim() || 'QAAUTO Cancelamento de ocorrência de saúde 1',
  );

  return { escola, colaborador, justificativa, dataInicio, totalDias, motivoCancelamento };
}
