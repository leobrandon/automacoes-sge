export const TIPOS_REGISTRO_PEDAGOGICO = [
  'Atividades Específicas',
  'Conteúdo Aplicado',
  'Parecer Descritivo (Ficha de Acompanhamento)',
  'Planejamento',
] as const;

export type TipoRegistroPedagogicoTipo = typeof TIPOS_REGISTRO_PEDAGOGICO[number];

export const TIPOS_TURMA_REGISTRO_PEDAGOGICO = [
  'Escolarização',
  'AEE',
  'Diversificada',
  'Alternativa',
] as const;

export type TipoTurmaRegistroPedagogico = typeof TIPOS_TURMA_REGISTRO_PEDAGOGICO[number];
export type TipoAssinaturaRegistroPedagogico = 'Padrão do Sistema' | 'Personalizadas' | 'Não Utiliza';
export type PeriodicidadeRegistroPedagogico =
  | 'Não Utiliza/Anual'
  | 'Não utiliza/Anual'
  | 'Mensal'
  | 'Bimestral'
  | 'Trimestral'
  | 'Semestral'
  | 'Semanal'
  | 'Quinzenal'
  | 'Definida pelo Professor';
export type FinalidadeParecerDescritivo = 'Não definida' | 'Para alunos atendidos fora da unidade';
export type FinalidadePlanejamento = 'Não definida' | 'Atendimentos Individualizados' | 'Aluno com Necessidades Especiais';
export type TipoRegistroPlanejamento = 'Por componente' | 'Único';
export type TipoItemAtividadesEspecificas = 'Texto Livre';

export interface TipoRegistroPedagogicoBaseData {
  tipo: TipoRegistroPedagogicoTipo;
  descricao: string;
  tipoTurma: TipoTurmaRegistroPedagogico;
  ano: number;
  composicao?: string;
  anosEscolares?: string[];
  ativo: boolean;
}

export interface AtividadesEspecificasData extends TipoRegistroPedagogicoBaseData {
  tipo: 'Atividades Específicas';
  agrupador: string;
  item: {
    tipo: TipoItemAtividadesEspecificas;
    titulo: string;
    obrigatorio: boolean;
    tamanhoMaximo: number;
  };
}

export interface ConteudoAplicadoData extends TipoRegistroPedagogicoBaseData {
  tipo: 'Conteúdo Aplicado';
  tipoAssinatura: TipoAssinaturaRegistroPedagogico;
}

export interface ParecerDescritivoData extends TipoRegistroPedagogicoBaseData {
  tipo: 'Parecer Descritivo (Ficha de Acompanhamento)';
  finalidade: FinalidadeParecerDescritivo;
  periodicidade: PeriodicidadeRegistroPedagogico;
  tipoAssinatura: TipoAssinaturaRegistroPedagogico;
}

export interface PlanejamentoData extends TipoRegistroPedagogicoBaseData {
  tipo: 'Planejamento';
  finalidade: FinalidadePlanejamento;
  periodicidade: PeriodicidadeRegistroPedagogico;
  tipoRegistro: TipoRegistroPlanejamento;
  tipoAssinatura: TipoAssinaturaRegistroPedagogico;
}

type BaseBuildOptions = Partial<Omit<TipoRegistroPedagogicoBaseData, 'tipo' | 'descricao' | 'ativo'>> & {
  descricao?: string;
  ativo?: boolean;
};

export type BuildAtividadesEspecificasOptions = BaseBuildOptions & {
  agrupador?: string;
  item?: Partial<AtividadesEspecificasData['item']>;
};
export type BuildConteudoAplicadoOptions = BaseBuildOptions & { tipoAssinatura?: TipoAssinaturaRegistroPedagogico };
export type BuildParecerDescritivoOptions = BaseBuildOptions & {
  finalidade?: FinalidadeParecerDescritivo;
  periodicidade?: PeriodicidadeRegistroPedagogico;
  tipoAssinatura?: TipoAssinaturaRegistroPedagogico;
};
export type BuildPlanejamentoOptions = BaseBuildOptions & {
  finalidade?: FinalidadePlanejamento;
  periodicidade?: PeriodicidadeRegistroPedagogico;
  tipoRegistro?: TipoRegistroPlanejamento;
  tipoAssinatura?: TipoAssinaturaRegistroPedagogico;
};

const REGEX_QAAUTO = /^QAAUTO\b/i;
const LIMITE_DESCRICAO = 100;
const OPCOES_ASSINATURA: readonly TipoAssinaturaRegistroPedagogico[] = [
  'Padrão do Sistema', 'Personalizadas', 'Não Utiliza',
];
const OPCOES_PERIODICIDADE: readonly PeriodicidadeRegistroPedagogico[] = [
  'Não Utiliza/Anual', 'Não utiliza/Anual', 'Mensal', 'Bimestral', 'Trimestral', 'Semestral',
  'Semanal', 'Quinzenal', 'Definida pelo Professor',
];

function textoObrigatorio(valor: unknown, campo: string): string {
  if (typeof valor !== 'string' || !valor.trim()) {
    throw new Error(`O campo "${campo}" é obrigatório e deve conter texto.`);
  }
  return valor.trim();
}

function descricaoFinal(descricao: string | undefined, padrao: string, sequencia: number): string {
  const base = textoObrigatorio(descricao?.trim() || padrao, 'descrição');
  if (!REGEX_QAAUTO.test(base)) {
    throw new Error('A descrição do Tipo de Registro Pedagógico deve começar com "QAAUTO".');
  }
  const final = `${base} ${sequencia}`;
  if (final.length > LIMITE_DESCRICAO) {
    throw new Error(`A descrição do Tipo de Registro Pedagógico deve ter até ${LIMITE_DESCRICAO} caracteres.`);
  }
  return final;
}

function nomeFilhoQAAuto(
  nome: string | undefined,
  padrao: string,
  campo: string,
  sequencia: number,
): string {
  const base = textoObrigatorio(nome?.trim() || padrao, campo);
  if (!REGEX_QAAUTO.test(base)) throw new Error(`O campo "${campo}" deve começar com "QAAUTO".`);
  return `${base} ${sequencia}`;
}

function validarSequencia(sequencia: number): void {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência do Tipo de Registro Pedagógico deve ser um inteiro positivo.');
  }
}

function tipoTurmaObrigatorio(valor: unknown): TipoTurmaRegistroPedagogico {
  if (typeof valor !== 'string' || !TIPOS_TURMA_REGISTRO_PEDAGOGICO.includes(valor as TipoTurmaRegistroPedagogico)) {
    throw new Error('O campo "tipoTurma" deve ser Escolarização, AEE, Diversificada ou Alternativa.');
  }
  return valor as TipoTurmaRegistroPedagogico;
}

function anoObrigatorio(valor: unknown): number {
  if (!Number.isSafeInteger(valor) || (valor as number) < 2000 || (valor as number) > 2200) {
    throw new Error('O campo "ano" deve ser um ano letivo inteiro válido.');
  }
  return valor as number;
}

function ativoOpcional(valor: unknown): boolean {
  if (valor === undefined) return true;
  if (typeof valor !== 'boolean') throw new Error('O campo "ativo" deve ser booleano.');
  return valor;
}

function composicaoOpcional(valor: unknown): string | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  return textoObrigatorio(valor, 'composicao');
}

function anosEscolaresOpcional(valor: unknown): string[] | undefined {
  if (valor === undefined || valor === null) return undefined;
  if (!Array.isArray(valor) || valor.some((ano) => typeof ano !== 'string' || !ano.trim())) {
    throw new Error('O campo "anosEscolares" deve ser uma lista de nomes de anos escolares preenchidos.');
  }
  const anos = valor.map((ano) => (ano as string).trim());
  if (new Set(anos.map((ano) => ano.toLocaleUpperCase('pt-BR'))).size !== anos.length) {
    throw new Error('O campo "anosEscolares" não pode conter opções repetidas.');
  }
  return anos;
}

function validarComposicao(tipoTurma: TipoTurmaRegistroPedagogico, composicao: string | undefined, tipo: TipoRegistroPedagogicoTipo): void {
  // Atividades Específicas não exibe composição para turmas AEE ou Diversificada.
  const podeOmitir = tipo === 'Atividades Específicas'
    ? tipoTurma === 'AEE' || tipoTurma === 'Diversificada'
    : tipoTurma === 'AEE';
  if (!podeOmitir && !composicao) {
    throw new Error(`O campo "composicao" é obrigatório para ${tipoTurma}.`);
  }
}

function baseData<Tipo extends TipoRegistroPedagogicoTipo>(
  tipo: Tipo,
  options: BaseBuildOptions,
  sequencia: number,
): Omit<TipoRegistroPedagogicoBaseData, 'tipo'> & { tipo: Tipo } {
  validarSequencia(sequencia);
  const descricao = descricaoFinal(options.descricao, `QAAUTO Tipo de Registro Pedagógico ${tipo}`, sequencia);
  const tipoTurma = tipoTurmaObrigatorio(options.tipoTurma);
  const composicao = composicaoOpcional(options.composicao);
  validarComposicao(tipoTurma, composicao, tipo);
  const ativo = ativoOpcional(options.ativo);
  const dados: TipoRegistroPedagogicoBaseData = {
    tipo,
    descricao,
    tipoTurma,
    ano: anoObrigatorio(options.ano),
    ...(composicao ? { composicao } : {}),
    ...(options.anosEscolares !== undefined ? { anosEscolares: anosEscolaresOpcional(options.anosEscolares) } : {}),
    ativo,
  };
  return dados as Omit<TipoRegistroPedagogicoBaseData, 'tipo'> & { tipo: Tipo };
}

function opcaoAssinatura(valor: unknown): TipoAssinaturaRegistroPedagogico {
  if (typeof valor !== 'string' || !OPCOES_ASSINATURA.includes(valor as TipoAssinaturaRegistroPedagogico)) {
    throw new Error('O campo "tipoAssinatura" deve ser Padrão do Sistema, Personalizadas ou Não Utiliza.');
  }
  return valor as TipoAssinaturaRegistroPedagogico;
}

function opcaoPeriodicidade(valor: unknown): PeriodicidadeRegistroPedagogico {
  if (typeof valor !== 'string' || !OPCOES_PERIODICIDADE.includes(valor as PeriodicidadeRegistroPedagogico)) {
    throw new Error('O campo "periodicidade" deve corresponder a uma opção disponível no formulário.');
  }
  return valor as PeriodicidadeRegistroPedagogico;
}

export function buildAtividadesEspecificas(
  options: BuildAtividadesEspecificasOptions = {},
  sequencia = 1,
): AtividadesEspecificasData {
  const base = baseData('Atividades Específicas', options, sequencia);
  const tipoItem = options.item?.tipo ?? 'Texto Livre';
  if (tipoItem !== 'Texto Livre') {
    throw new Error('O campo "item.tipo" deve ser Texto Livre para Atividades Específicas.');
  }
  const obrigatorio = options.item?.obrigatorio ?? true;
  if (typeof obrigatorio !== 'boolean') throw new Error('O campo "item.obrigatorio" deve ser booleano.');
  const tamanhoMaximo = options.item?.tamanhoMaximo ?? 1000;
  if (!Number.isSafeInteger(tamanhoMaximo) || tamanhoMaximo < 1 || tamanhoMaximo > 100000) {
    throw new Error('O campo "item.tamanhoMaximo" deve ser um inteiro entre 1 e 100000.');
  }

  return {
    ...base,
    agrupador: nomeFilhoQAAuto(
      options.agrupador,
      'QAAUTO Agrupador de Atividades Específicas',
      'agrupador',
      sequencia,
    ),
    item: {
      tipo: tipoItem,
      titulo: nomeFilhoQAAuto(
        options.item?.titulo,
        'QAAUTO Item de Atividades Específicas',
        'item.titulo',
        sequencia,
      ),
      obrigatorio,
      tamanhoMaximo,
    },
  };
}

export function buildConteudoAplicado(
  options: BuildConteudoAplicadoOptions = {},
  sequencia = 1,
): ConteudoAplicadoData {
  const tipoAssinatura = opcaoAssinatura(options.tipoAssinatura ?? 'Padrão do Sistema');
  return {
    ...baseData('Conteúdo Aplicado', options, sequencia),
    tipoAssinatura,
  };
}

export function buildParecerDescritivo(
  options: BuildParecerDescritivoOptions = {},
  sequencia = 1,
): ParecerDescritivoData {
  const finalidade = options.finalidade ?? 'Não definida';
  if (finalidade !== 'Não definida' && finalidade !== 'Para alunos atendidos fora da unidade') {
    throw new Error('O campo "finalidade" do Parecer Descritivo é inválido.');
  }
  return {
    ...baseData('Parecer Descritivo (Ficha de Acompanhamento)', options, sequencia),
    finalidade,
    periodicidade: opcaoPeriodicidade(options.periodicidade),
    tipoAssinatura: opcaoAssinatura(options.tipoAssinatura ?? 'Padrão do Sistema'),
  };
}

export function buildPlanejamento(
  options: BuildPlanejamentoOptions = {},
  sequencia = 1,
): PlanejamentoData {
  descricaoFinal(options.descricao, 'QAAUTO Tipo de Registro Pedagógico Planejamento', sequencia);
  const finalidade = options.finalidade ?? 'Não definida';
  if (finalidade !== 'Não definida' && finalidade !== 'Atendimentos Individualizados' && finalidade !== 'Aluno com Necessidades Especiais') {
    throw new Error('O campo "finalidade" do Planejamento é inválido.');
  }
  if (options.tipoRegistro !== 'Por componente' && options.tipoRegistro !== 'Único') {
    throw new Error('O campo "tipo do registro" deve ser Por componente ou Único.');
  }
  return {
    ...baseData('Planejamento', options, sequencia),
    finalidade,
    periodicidade: opcaoPeriodicidade(options.periodicidade),
    tipoRegistro: options.tipoRegistro,
    tipoAssinatura: opcaoAssinatura(options.tipoAssinatura ?? 'Padrão do Sistema'),
  };
}

export function isTipoRegistroPedagogicoQAAuto(descricao: string): boolean {
  return typeof descricao === 'string' && REGEX_QAAUTO.test(descricao.trim());
}
