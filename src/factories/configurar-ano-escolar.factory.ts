export interface ConfiguracaoAnoEscolarDados {
  anoLetivo: string;
  calendarioEscolar: string;
  composicaoEnsino: string;
  anoEscolar: string;
  tipoDiario: string;
  formaAvaliacao: string;
  anoEscolarDestino: string;
  capacidadeMinima: string;
  capacidadeMaxima: string;
  observacaoDiarioClasse: string;
}

export interface ConfiguracaoAnoEscolarAlvo {
  calendarioEscolar: string;
  composicaoEnsino: string;
  anoEscolar: string;
}

const OBRIGATORIOS = [
  'anoLetivo',
  'calendarioEscolar',
  'composicaoEnsino',
  'anoEscolar',
  'tipoDiario',
  'formaAvaliacao',
  'anoEscolarDestino',
] as const;

const OPCIONAIS = ['capacidadeMinima', 'capacidadeMaxima', 'observacaoDiarioClasse'] as const;

export function buildConfiguracaoAnoEscolar(
  dados: ConfiguracaoAnoEscolarDados,
): ConfiguracaoAnoEscolarDados {
  for (const campo of [...OBRIGATORIOS, ...OPCIONAIS] as const) {
    const valor = dados[campo] ?? '';
    if (typeof valor !== 'string')
      throw new Error(`"${campo}" deve ser texto em dados_configurar_ano_escolar.json.`);
  }
  const d = Object.fromEntries(
    [...OBRIGATORIOS, ...OPCIONAIS].map((campo) => [campo, String(dados[campo] ?? '').trim()]),
  ) as unknown as ConfiguracaoAnoEscolarDados;
  for (const campo of OBRIGATORIOS)
    if (!d[campo]) throw new Error(`Informe "${campo}" em dados_configurar_ano_escolar.json.`);
  if (!isCalendarioQAAuto(d.calendarioEscolar))
    throw new Error('O calendário escolar deve começar com QAAUTO.');
  for (const campo of ['capacidadeMinima', 'capacidadeMaxima'] as const)
    if (d[campo] && !/^\d{1,4}$/.test(d[campo]))
      throw new Error(`"${campo}" deve ter de 1 a 4 dígitos.`);
  // O campo só existe na tela com diário Coletivo; com Individual ele fica oculto.
  if (d.observacaoDiarioClasse && d.tipoDiario !== 'Coletivo')
    throw new Error('A observação para o diário de classe só é exibida com tipo de diário Coletivo.');
  if (d.observacaoDiarioClasse.length > 500)
    throw new Error('A observação para o diário de classe deve ter até 500 caracteres.');
  return d;
}

export const isCalendarioQAAuto = (calendario: string): boolean =>
  /^QAAUTO\b/i.test(calendario.trim());
