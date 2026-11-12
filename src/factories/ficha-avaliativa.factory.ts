export const FORMAS_AVALIACAO_FICHA = ['Nota', 'Conceito'] as const;
export const PERIODICIDADES_FICHA = ['Não Utiliza', 'Bimestral', 'Trimestral', 'Semestral'] as const;
export const ASSINATURAS_FICHA = ['Padrão do Sistema', 'Não Utiliza'] as const;

export type FichaAvaliativaData = {
  descricao: string;
  tituloParaImpressao: string;
  formaAvaliacao: typeof FORMAS_AVALIACAO_FICHA[number];
  periodicidade: typeof PERIODICIDADES_FICHA[number];
  assinatura: typeof ASSINATURAS_FICHA[number];
  informacaoComplementar: string;
  agrupador: string;
  topico: string;
  desempenhoFinal: string;
};

export type BuildFichaAvaliativaOptions = Partial<FichaAvaliativaData>;

function texto(valor: string | undefined, padrao: string): string {
  return valor?.trim() || padrao;
}

function validarOpcao<T extends string>(valor: string | undefined, opcoes: readonly T[], campo: string, padrao: T): T {
  const escolhido = valor?.trim();
  if (!escolhido) return padrao;
  if (!opcoes.includes(escolhido as T)) {
    throw new Error(`Valor "${escolhido}" inválido para "${campo}". Opções: ${opcoes.join(', ')}.`);
  }
  return escolhido as T;
}

export function buildFichaAvaliativa(options: BuildFichaAvaliativaOptions = {}, sequencia = 1): FichaAvaliativaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência da Ficha Avaliativa deve ser um inteiro positivo.');
  }

  const descricaoBase = texto(options.descricao, 'QAAUTO Ficha Avaliativa');
  if (!/^QAAUTO\b/i.test(descricaoBase)) {
    throw new Error('A descrição da Ficha Avaliativa deve começar com "QAAUTO".');
  }
  const nome = (valor: string | undefined, padrao: string) => `${texto(valor, padrao)} ${sequencia}`;
  const data: FichaAvaliativaData = {
    descricao: `${descricaoBase} ${sequencia}`,
    tituloParaImpressao: texto(options.tituloParaImpressao, ''),
    formaAvaliacao: validarOpcao(options.formaAvaliacao, FORMAS_AVALIACAO_FICHA, 'formaAvaliacao', 'Conceito'),
    periodicidade: validarOpcao(options.periodicidade, PERIODICIDADES_FICHA, 'periodicidade', 'Não Utiliza'),
    assinatura: validarOpcao(options.assinatura, ASSINATURAS_FICHA, 'assinatura', 'Padrão do Sistema'),
    informacaoComplementar: nome(options.informacaoComplementar, 'QAAUTO Informações Complementares'),
    agrupador: nome(options.agrupador, 'QAAUTO Agrupador'),
    topico: nome(options.topico, 'QAAUTO Tópico'),
    desempenhoFinal: nome(options.desempenhoFinal, 'QAAUTO Desempenho Final'),
  };

  if (data.descricao.length > 200 || data.tituloParaImpressao.length > 200) {
    throw new Error('Descrição e Título para Impressão devem ter até 200 caracteres.');
  }
  if (data.informacaoComplementar.length > 20000) {
    throw new Error('A Informação Complementar deve ter até 20000 caracteres.');
  }
  if (data.agrupador.length > 200 || data.desempenhoFinal.length > 200) {
    throw new Error('Agrupador e Desempenho Final devem ter até 200 caracteres.');
  }
  if (data.topico.length > 600) throw new Error('O Tópico deve ter até 600 caracteres.');
  return data;
}

export function isFichaAvaliativaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
