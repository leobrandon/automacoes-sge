export const OPCOES_ABONO_JUSTIFICATIVA = ['Sim', 'Não'] as const;
export type OpcaoAbonoJustificativa = typeof OPCOES_ABONO_JUSTIFICATIVA[number];

export interface JustificativaFrequenciaData {
  descricao: string;
  abonaFalta: boolean;
  ativa: boolean;
}

export interface BuildJustificativaFrequenciaOptions {
  descricao?: string;
  abonoPorSequencia?: readonly OpcaoAbonoJustificativa[];
  ativa?: OpcaoAbonoJustificativa;
}

function opcaoSimNao(valor: string | undefined, campo: string, padrao: OpcaoAbonoJustificativa): OpcaoAbonoJustificativa {
  const escolhido = valor?.trim() || padrao;
  if (!OPCOES_ABONO_JUSTIFICATIVA.includes(escolhido as OpcaoAbonoJustificativa)) {
    throw new Error(`O campo "${campo}" deve ser "Sim" ou "Não".`);
  }
  return escolhido as OpcaoAbonoJustificativa;
}

export function buildJustificativaFrequencia(
  options: BuildJustificativaFrequenciaOptions = {},
  sequencia = 1,
): JustificativaFrequenciaData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência da Justificativa de Frequência deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Justificativa de Frequência';
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição da Justificativa de Frequência deve começar com "QAAUTO".');
  }

  const abonoConfigurado = options.abonoPorSequencia?.[sequencia - 1];
  if (options.abonoPorSequencia && abonoConfigurado === undefined) {
    throw new Error(`Não existe uma opção de Abono configurada para a sequência ${sequencia}.`);
  }
  const abono = opcaoSimNao(abonoConfigurado, 'abonoPorSequencia', 'Não');
  const ativa = opcaoSimNao(options.ativa, 'ativa', 'Sim');

  return {
    descricao: `${base} ${sequencia}`,
    abonaFalta: abono === 'Sim',
    ativa: ativa === 'Sim',
  };
}

export function isJustificativaFrequenciaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
