export const TIPOS_ATENDIMENTO_CALENDARIO = ['Integral', 'Parcial'] as const;
export const PERIODICIDADES_CALENDARIO = ['Anual', 'Semestral'] as const;
export const MATERIAS_ESCOLARES_CALENDARIO = [
  'Componente Curricular',
  'Campo de Experiência (Eixo)',
  'Módulo/Unidade Curricular',
] as const;
export const ORIGENS_CARGA_HORARIA_CALENDARIO = ['Turma', 'Componente', 'Ficha'] as const;

export type TipoAtendimentoCalendario = typeof TIPOS_ATENDIMENTO_CALENDARIO[number];
export type PeriodicidadeCalendario = typeof PERIODICIDADES_CALENDARIO[number];
export type MateriaEscolarCalendario = typeof MATERIAS_ESCOLARES_CALENDARIO[number];
export type OrigemCargaHorariaCalendario = typeof ORIGENS_CARGA_HORARIA_CALENDARIO[number];

export interface CalendarioComponenteCurricularOpcoes {
  componente: string;
  cargaHoraria: string;
  quantidadeAulasSemanais: string;
  quantidadeAulasPresenciais: string;
  quantidadeAulasNaoPresenciais: string;
  formaAvaliacao: string;
}

export interface CalendarioAnoComposicaoOpcoes {
  anoEscolar: string;
  tipoDiario: string;
  formaAvaliacao: string;
  anoEscolarDestino: string;
  fichaAvaliativa: string;
  tipoObservacoesFichaAvaliativa?: string;
  tipoParecerFinalFichaAvaliativa?: string;
  observacaoDiarioClasse?: string;
  componentesCurriculares: CalendarioComponenteCurricularOpcoes[];
}

/**
 * Configuração de uma Composição de Ensino vinculada ao calendário.
 * O SGE recusa duas configurações com a mesma composição e o mesmo Tipo de Atendimento.
 */
export interface CalendarioComposicaoOpcoes {
  composicao: string;
  tipoAtendimento: TipoAtendimentoCalendario;
  periodicidade: PeriodicidadeCalendario;
  materiaEscolar: MateriaEscolarCalendario;
  origemCargaHoraria: OrigemCargaHorariaCalendario;
  /** Texto exato da Fórmula de Aprovação; vazio usa a única opção oferecida pelo calendário. */
  formulaAprovacao?: string;
  /** Configura um ano e sua estrutura curricular dentro desta composição. */
  anoComposicao?: CalendarioAnoComposicaoOpcoes;
}

export interface CalendarioEscolarOpcoes {
  descricao: string;
  anoLetivo: string;
  datas: Record<string, string>;
  composicoes: CalendarioComposicaoOpcoes[];
}

function validarComposicao(composicao: CalendarioComposicaoOpcoes, indice: number): void {
  const posicao = `Composição de Ensino ${indice + 1}`;
  if (typeof composicao.composicao !== 'string' || !composicao.composicao.trim())
    throw new Error(`Informe o nome da composição em ${posicao}.`);
  if (!TIPOS_ATENDIMENTO_CALENDARIO.includes(composicao.tipoAtendimento))
    throw new Error(
      `Tipo de Atendimento inválido em ${posicao}: use ${TIPOS_ATENDIMENTO_CALENDARIO.join(' ou ')}.`,
    );
  if (!PERIODICIDADES_CALENDARIO.includes(composicao.periodicidade))
    throw new Error(
      `Periodicidade inválida em ${posicao}: use ${PERIODICIDADES_CALENDARIO.join(' ou ')}.`,
    );
  if (!MATERIAS_ESCOLARES_CALENDARIO.includes(composicao.materiaEscolar))
    throw new Error(
      `Tipo Matéria Escolar inválido em ${posicao}: use ${MATERIAS_ESCOLARES_CALENDARIO.join(' | ')}.`,
    );
  if (!ORIGENS_CARGA_HORARIA_CALENDARIO.includes(composicao.origemCargaHoraria))
    throw new Error(
      `Origem Carga Horária inválida em ${posicao}: use ${ORIGENS_CARGA_HORARIA_CALENDARIO.join(' | ')}.`,
    );
  if (composicao.formulaAprovacao != null && typeof composicao.formulaAprovacao !== 'string')
    throw new Error(`Fórmula de Aprovação inválida em ${posicao}.`);
  if (composicao.anoComposicao) {
    const ano = composicao.anoComposicao;
    if (
      !ano.anoEscolar ||
      !ano.tipoDiario ||
      !ano.formaAvaliacao ||
      !ano.anoEscolarDestino ||
      !ano.fichaAvaliativa
    )
      throw new Error(`Informe os campos obrigatórios do ano da composição em ${posicao}.`);
    if (ano.observacaoDiarioClasse && !/^QAAUTO\b/i.test(ano.observacaoDiarioClasse.trim()))
      throw new Error(`A observação do ano da composição deve começar com QAAUTO em ${posicao}.`);
    if (!Array.isArray(ano.componentesCurriculares) || ano.componentesCurriculares.length < 2)
      throw new Error(`Informe ao menos 2 componentes curriculares para ${posicao}.`);
    for (const componente of ano.componentesCurriculares) {
      if (
        !componente.componente ||
        !/^\d+$/.test(componente.cargaHoraria) ||
        !/^\d+$/.test(componente.quantidadeAulasSemanais) ||
        !/^\d+$/.test(componente.quantidadeAulasPresenciais) ||
        !/^\d+$/.test(componente.quantidadeAulasNaoPresenciais) ||
        !componente.formaAvaliacao
      )
        throw new Error(`Informe o componente, avaliação e cargas horárias numéricas em ${posicao}.`);
      if (
        Number(componente.quantidadeAulasPresenciais) +
          Number(componente.quantidadeAulasNaoPresenciais) !==
        Number(componente.quantidadeAulasSemanais)
      )
        throw new Error(`As aulas presenciais e não presenciais devem somar as aulas semanais em ${posicao}.`);
    }
  }
}

export function buildCalendarioEscolar(
  opcoes: CalendarioEscolarOpcoes,
  sequencia = 1,
): CalendarioEscolarOpcoes {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1)
    throw new Error('Sequência deve ser inteira e positiva.');
  const base = opcoes.descricao.trim() || 'QAAUTO Calendário Escolar';
  if (!/^QAAUTO\b/i.test(base)) throw new Error('Descrição deve começar por QAAUTO.');
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > 100) throw new Error('Descrição deve ter até 100 caracteres.');
  if (!/^\d{4}$/.test(opcoes.anoLetivo))
    throw new Error('Informe o ano letivo com quatro dígitos.');
  const campos = [
    'InicioPrimeiroBimestre',
    'FimPrimeiroBimestre',
    'LimiteRegistroConteudoPrimeiroBimestre',
    'InicioSegundoBimestre',
    'FimSegundoBimestre',
    'LimiteRegistroConteudoSegundoBimestre',
    'InicioTerceiroBimestre',
    'FimTerceiroBimestre',
    'LimiteRegistroConteudoTerceiroBimestre',
    'InicioQuartoBimestre',
    'FimQuartoBimestre',
    'LimiteRegistroConteudoQuartoBimestre',
    'FimPrimeiroSemestre',
    'FimSegundoSemestre',
  ];
  for (const campo of campos)
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(opcoes.datas[campo] || ''))
      throw new Error(`Informe ${campo} em DD/MM/AAAA.`);
  if (!Array.isArray(opcoes.composicoes) || opcoes.composicoes.length < 3)
    throw new Error('Informe ao menos 3 Composições de Ensino para o calendário.');
  const chaves = new Set<string>();
  opcoes.composicoes.forEach((composicao, indice) => {
    validarComposicao(composicao, indice);
    const chave = `${composicao.composicao.trim().toLowerCase()}|${composicao.tipoAtendimento}`;
    if (chaves.has(chave))
      throw new Error(
        `Composição "${composicao.composicao}" repetida com o Tipo de Atendimento ${composicao.tipoAtendimento}; o SGE recusa essa duplicidade.`,
      );
    chaves.add(chave);
  });
  return { ...opcoes, descricao, composicoes: opcoes.composicoes.map((c) => ({ ...c })) };
}
