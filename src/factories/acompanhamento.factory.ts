export const PERCENTUAIS_RESPOSTA = [0, 25, 50, 75, 100] as const;

export interface AcompanhamentoData {
  /** Vazio = primeiro Tipo de pauta QAAUTO cadastrado (dado de apoio, não é criado pela automação). */
  tipoPauta: string;
  /** Vazio = tenta cada destino permitido da pauta, na ordem da lista, até achar um livre. */
  escola: string;
  /** Nome do período sem as datas (ex.: "4º Bimestre", "Anual"). Vazio = tenta cada período até achar um livre. */
  periodo: string;
  /** Botão de resposta clicado em cada item da pauta (a Secretaria é quem lança a pontuação). */
  percentualResposta: number;
}

export type BuildAcompanhamentoOptions = Partial<AcompanhamentoData>;

/**
 * O Acompanhamento não tem nome: a chave é pauta + escola + período, e o SGE recusa repetir a combinação
 * ("Já existe um acompanhamento registrado para este período e destino"). Não há exclusão pela tela, então
 * a combinação livre é descoberta na hora (ver `criarAcompanhamento`).
 */
export function buildAcompanhamento(options: BuildAcompanhamentoOptions = {}): AcompanhamentoData {
  const tipoPauta = options.tipoPauta?.trim() || '';
  if (tipoPauta && !isAcompanhamentoQAAuto(tipoPauta)) {
    throw new Error('O Tipo de pauta usado pela automação deve começar com QAAUTO.');
  }

  const percentualResposta = options.percentualResposta ?? 100;
  if (!(PERCENTUAIS_RESPOSTA as readonly number[]).includes(percentualResposta)) {
    throw new Error(`O percentual de resposta deve ser um destes: ${PERCENTUAIS_RESPOSTA.join(', ')}.`);
  }

  return {
    tipoPauta,
    escola: options.escola?.trim() || '',
    periodo: options.periodo?.trim() || '',
    percentualResposta,
  };
}

export function isAcompanhamentoQAAuto(tipoPauta: string): boolean {
  return /^QAAUTO\b/i.test(tipoPauta.trim());
}
