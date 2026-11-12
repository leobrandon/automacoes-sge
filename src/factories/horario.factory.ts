/** O SGE oferece apenas Mensal e Diária (Semanal está desativada no código). */
export const TIPOS_CARGA_HORARIA_HORARIO = ['Mensal', 'Diária'] as const;
export type TipoCargaHorariaHorario = typeof TIPOS_CARGA_HORARIA_HORARIO[number];

export const COLUNAS_REFEICAO_HORARIO = [
  'Saída 1 Entrada 2',
  'Saída 2 Entrada 3',
  'Saída 3 Entrada 4',
  'Saída 4 Entrada 5',
] as const;
export type ColunaRefeicaoHorario = typeof COLUNAS_REFEICAO_HORARIO[number];

/** Ordem das linhas da jornada na tela (índice usado nos ids `ListaPontoHorarioHora_<i>__...`). */
export const DIAS_SEMANA_HORARIO = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;
export type DiaSemanaHorario = typeof DIAS_SEMANA_HORARIO[number];

/** Ordem das linhas da aba Coluna (índice usado nos ids `ListaPontoHorarioColuna_<i>__...`). */
export const COLUNAS_HORARIO = [
  'HT', 'CH', 'SP', 'SN', 'EA', 'SA', 'AB', 'BS', 'BT', 'BC',
  'BD', 'BA', 'ADCNOT', 'HRD', 'JUS', 'EXT', 'AN', 'SPDR', 'SNDR', 'ResponsavelImediato',
] as const;
export type CodigoColunaHorario = typeof COLUNAS_HORARIO[number];

export const CAMPOS_PERCENTUAL_HORA_EXTRA = [
  'diaUtil', 'sabado', 'domingo', 'feriado', 'facultativo',
  'diaUtilNoturno', 'sabadoNoturno', 'domingoNoturno', 'folga', 'facultativoNoturno',
] as const;
export type CampoPercentualHoraExtra = typeof CAMPOS_PERCENTUAL_HORA_EXTRA[number];

export const LIMITE_DESCRICAO_HORARIO = 250;
export const HORA_DIURNA_REDUZIDA_PADRAO = '00:50:00';
export const HORA_NOTURNA_REDUZIDA_PADRAO = '00:52:30';

export interface JornadaDiaHorario {
  entrada1?: string;
  saida1?: string;
  entrada2?: string;
  saida2?: string;
  entrada3?: string;
  saida3?: string;
  entrada4?: string;
  saida4?: string;
  entrada5?: string;
  saida5?: string;
  toleranciaFalta?: string;
  toleranciaExtra?: string;
  cargaHoraria?: string;
  almocoLivre?: boolean;
  compensado?: boolean;
  neutro?: boolean;
}

export type JornadaHorario = Partial<Record<DiaSemanaHorario, JornadaDiaHorario>>;

export interface HorasExtrasHorario {
  /** Nome de OUTRO horário cuja configuração será reutilizada (exclusivo com `percentuais`). */
  usarConfiguracaoDoHorario?: string;
  /** Percentuais de 1 a 100. Só editáveis na edição; a action grava o horário e depois os aplica. */
  percentuais?: Partial<Record<CampoPercentualHoraExtra, number>>;
}

export interface ColunaHorarioOpcoes {
  impressao?: boolean;
  edicao?: boolean;
  preFolha?: boolean;
}

export type ColunasHorario = Partial<Record<CodigoColunaHorario, ColunaHorarioOpcoes>>;

export interface HorarioData {
  descricao: string;
  tipo: TipoCargaHorariaHorario;
  colunaRefeicao: ColunaRefeicaoHorario;
  /** Fixar a carga horária em horas (somente dígitos; só vale para o tipo Mensal). */
  cargaHorariaFixaEmHoras?: string;
  /** HH:mm; o campo fica desabilitado quando `horario24Horas` é verdadeiro. */
  horarioFechamentoNoturno?: string;
  horario24Horas: boolean;
  habilitarBatidasPreAssinaladas: boolean;
  preencherFolgaEmBranco: boolean;
  bancoDeHoras: boolean;
  horaExtra: boolean;
  adicionalNoturno: boolean;
  exibirHoraDiurnaReduzida: boolean;
  /** HH:mm:ss, maior que zero e até 01:00:00. Só vale com `exibirHoraDiurnaReduzida`. */
  horaDiurnaReduzida?: string;
  exibirHoraNoturnaReduzida: boolean;
  /** HH:mm:ss, maior que zero e até 01:00:00. Só vale com `exibirHoraNoturnaReduzida`. */
  horaNoturnaReduzida?: string;
  jornada: JornadaHorario;
  horasExtras: HorasExtrasHorario;
  colunas: ColunasHorario;
  sequencia: number;
}

export interface BuildHorarioOptions {
  descricao?: string;
  tipo?: string;
  colunaRefeicao?: string;
  cargaHorariaFixaEmHoras?: string;
  horarioFechamentoNoturno?: string;
  horario24Horas?: boolean;
  habilitarBatidasPreAssinaladas?: boolean;
  preencherFolgaEmBranco?: boolean;
  bancoDeHoras?: boolean;
  horaExtra?: boolean;
  adicionalNoturno?: boolean;
  exibirHoraDiurnaReduzida?: boolean;
  horaDiurnaReduzida?: string;
  exibirHoraNoturnaReduzida?: boolean;
  horaNoturnaReduzida?: string;
  jornada?: JornadaHorario;
  horasExtras?: HorasExtrasHorario;
  colunas?: ColunasHorario;
}

const HORA_MINUTO = /^([01]\d|2[0-3]):[0-5]\d$/;
/** A carga horária soma horas (ex.: 24:00 em horário de 24 h), então não se limita a 23:59. */
const CARGA_HORARIA = /^\d{1,3}:[0-5]\d$/;
const HORA_MINUTO_SEGUNDO =/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/;

function vazio(valor: unknown): boolean {
  return valor === undefined || valor === null || valor === '';
}

/** Vazio (omitido, null ou "") vale false. */
function booleano(valor: unknown, campo: string): boolean {
  if (vazio(valor)) return false;
  if (typeof valor !== 'boolean') throw new Error(`O campo "${campo}" deve ser true ou false.`);
  return valor;
}

function horaMinuto(valor: unknown, campo: string, regex: RegExp = HORA_MINUTO): string | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (typeof valor !== 'string' || !regex.test(valor.trim())) {
    throw new Error(`O campo "${campo}" deve estar no formato HH:mm (ex.: 08:00).`);
  }
  return valor.trim();
}

function horaReduzida(valor: unknown, campo: string, padrao: string): string {
  if (valor === undefined || valor === null || valor === '') return padrao;
  if (typeof valor !== 'string' || !HORA_MINUTO_SEGUNDO.test(valor.trim())) {
    throw new Error(`O campo "${campo}" deve estar no formato HH:mm:ss (ex.: ${padrao}).`);
  }
  const hora = valor.trim();
  if (hora === '00:00:00' || hora > '01:00:00') {
    throw new Error(`O campo "${campo}" deve ser maior que 00:00:00 e no máximo 01:00:00.`);
  }
  return hora;
}

/** No tipo Diária a tela só exibe estes campos na jornada; os demais ficam ocultos. */
const CAMPOS_JORNADA_DIARIA = ['cargaHoraria', 'neutro'];

function jornadaValida(jornada: JornadaHorario | undefined, tipo: TipoCargaHorariaHorario): JornadaHorario {
  if (jornada === undefined) return {};
  if (typeof jornada !== 'object' || jornada === null || Array.isArray(jornada)) {
    throw new Error('"jornada" deve ser um objeto com os dias da semana.');
  }
  const camposHora = [
    'entrada1', 'saida1', 'entrada2', 'saida2', 'entrada3', 'saida3', 'entrada4', 'saida4', 'entrada5', 'saida5',
    'toleranciaFalta', 'toleranciaExtra', 'cargaHoraria',
  ] as const;
  const camposBooleanos = ['almocoLivre', 'compensado', 'neutro'] as const;
  const resultado: JornadaHorario = {};

  for (const [dia, valores] of Object.entries(jornada)) {
    if (!DIAS_SEMANA_HORARIO.includes(dia as DiaSemanaHorario)) {
      throw new Error(`Dia "${dia}" inválido em "jornada". Use: ${DIAS_SEMANA_HORARIO.join(', ')}.`);
    }
    if (typeof valores !== 'object' || valores === null || Array.isArray(valores)) {
      throw new Error(`"jornada.${dia}" deve ser um objeto.`);
    }
    const desconhecidos = Object.keys(valores)
      .filter((campo) => !(camposHora as readonly string[]).includes(campo)
        && !(camposBooleanos as readonly string[]).includes(campo));
    if (desconhecidos.length > 0) {
      throw new Error(`Campos desconhecidos em "jornada.${dia}": ${desconhecidos.join(', ')}.`);
    }

    const dia_: JornadaDiaHorario = {};
    for (const campo of camposHora) {
      const hora = horaMinuto(valores[campo], `jornada.${dia}.${campo}`, campo === 'cargaHoraria' ? CARGA_HORARIA : HORA_MINUTO);
      if (hora) dia_[campo] = hora;
    }
    for (const campo of camposBooleanos) {
      if (!vazio(valores[campo])) dia_[campo] = booleano(valores[campo], `jornada.${dia}.${campo}`);
    }
    if (tipo === 'Diária') {
      // `false` num campo oculto é só o valor "desligado" do modelo do JSON: descarta sem erro.
      const ocultos = Object.entries(dia_)
        .filter(([campo, valor]) => !CAMPOS_JORNADA_DIARIA.includes(campo) && valor !== false)
        .map(([campo]) => campo);
      if (ocultos.length > 0) {
        throw new Error(
          `No tipo Diária o SGE só exibe ${CAMPOS_JORNADA_DIARIA.join(' e ')} na jornada; `
          + `"jornada.${dia}" informa campos ocultos: ${ocultos.join(', ')}.`,
        );
      }
      for (const campo of Object.keys(dia_)) {
        if (!CAMPOS_JORNADA_DIARIA.includes(campo)) delete dia_[campo as keyof JornadaDiaHorario];
      }
    }
    if (Object.keys(dia_).length > 0) resultado[dia as DiaSemanaHorario] = dia_;
  }
  return resultado;
}

function horasExtrasValidas(horasExtras: HorasExtrasHorario | undefined): HorasExtrasHorario {
  if (horasExtras === undefined) return {};
  if (typeof horasExtras !== 'object' || horasExtras === null || Array.isArray(horasExtras)) {
    throw new Error('"horasExtras" deve ser um objeto.');
  }
  const desconhecidos = Object.keys(horasExtras)
    .filter((campo) => campo !== 'usarConfiguracaoDoHorario' && campo !== 'percentuais');
  if (desconhecidos.length > 0) throw new Error(`Campos desconhecidos em "horasExtras": ${desconhecidos.join(', ')}.`);

  const resultado: HorasExtrasHorario = {};
  const outro = horasExtras.usarConfiguracaoDoHorario;
  if (outro !== undefined && outro !== null && outro !== '') {
    if (typeof outro !== 'string' || !outro.trim()) {
      throw new Error('"horasExtras.usarConfiguracaoDoHorario" deve ser o nome de um horário.');
    }
    resultado.usarConfiguracaoDoHorario = outro.trim();
  }

  const percentuais = horasExtras.percentuais;
  if (percentuais !== undefined && percentuais !== null) {
    if (typeof percentuais !== 'object' || Array.isArray(percentuais)) {
      throw new Error('"horasExtras.percentuais" deve ser um objeto.');
    }
    const validos: Partial<Record<CampoPercentualHoraExtra, number>> = {};
    for (const [campo, valor] of Object.entries(percentuais)) {
      if (!CAMPOS_PERCENTUAL_HORA_EXTRA.includes(campo as CampoPercentualHoraExtra)) {
        throw new Error(`Percentual "${campo}" inválido. Use: ${CAMPOS_PERCENTUAL_HORA_EXTRA.join(', ')}.`);
      }
      if (valor === undefined || valor === null || (valor as unknown) === '') continue;
      if (!Number.isInteger(valor) || valor < 1 || valor > 100) {
        throw new Error(`O percentual "${campo}" deve ser um inteiro entre 1 e 100.`);
      }
      validos[campo as CampoPercentualHoraExtra] = valor;
    }
    if (Object.keys(validos).length > 0) resultado.percentuais = validos;
  }

  if (resultado.usarConfiguracaoDoHorario && resultado.percentuais) {
    throw new Error('Informe "usarConfiguracaoDoHorario" OU "percentuais" em horasExtras, não os dois.');
  }
  return resultado;
}

function colunasValidas(colunas: ColunasHorario | undefined): ColunasHorario {
  if (colunas === undefined) return {};
  if (typeof colunas !== 'object' || colunas === null || Array.isArray(colunas)) {
    throw new Error('"colunas" deve ser um objeto com os códigos das colunas.');
  }
  const resultado: ColunasHorario = {};
  for (const [codigo, opcoes] of Object.entries(colunas)) {
    if (!COLUNAS_HORARIO.includes(codigo as CodigoColunaHorario)) {
      throw new Error(`Coluna "${codigo}" inválida. Use: ${COLUNAS_HORARIO.join(', ')}.`);
    }
    if (typeof opcoes !== 'object' || opcoes === null || Array.isArray(opcoes)) {
      throw new Error(`"colunas.${codigo}" deve ser um objeto com impressao, edicao e/ou preFolha.`);
    }
    const desconhecidos = Object.keys(opcoes).filter((campo) => !['impressao', 'edicao', 'preFolha'].includes(campo));
    if (desconhecidos.length > 0) throw new Error(`Campos desconhecidos em "colunas.${codigo}": ${desconhecidos.join(', ')}.`);

    const validas: ColunaHorarioOpcoes = {};
    for (const campo of ['impressao', 'edicao', 'preFolha'] as const) {
      if (!vazio(opcoes[campo])) validas[campo] = booleano(opcoes[campo], `colunas.${codigo}.${campo}`);
    }
    if (Object.keys(validas).length > 0) resultado[codigo as CodigoColunaHorario] = validas;
  }
  return resultado;
}

export function buildHorario(options: BuildHorarioOptions = {}, sequencia = 1): HorarioData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência do Horário deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Horario';
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição do Horário deve começar com "QAAUTO".');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO_HORARIO) {
    throw new Error(`A descrição do Horário deve ter no máximo ${LIMITE_DESCRICAO_HORARIO} caracteres.`);
  }

  const tipo = options.tipo?.trim() || 'Mensal';
  if (!TIPOS_CARGA_HORARIA_HORARIO.includes(tipo as TipoCargaHorariaHorario)) {
    throw new Error(`Tipo "${tipo}" inválido. Opções: ${TIPOS_CARGA_HORARIA_HORARIO.join(', ')}.`);
  }
  const colunaRefeicao = options.colunaRefeicao?.trim() || COLUNAS_REFEICAO_HORARIO[0];
  if (!COLUNAS_REFEICAO_HORARIO.includes(colunaRefeicao as ColunaRefeicaoHorario)) {
    throw new Error(`Coluna Refeição "${colunaRefeicao}" inválida. Opções: ${COLUNAS_REFEICAO_HORARIO.join(', ')}.`);
  }

  const cargaFixa = options.cargaHorariaFixaEmHoras?.toString().trim() || undefined;
  if (cargaFixa !== undefined) {
    if (!/^\d{1,4}$/.test(cargaFixa)) {
      throw new Error('"cargaHorariaFixaEmHoras" deve conter apenas dígitos (ex.: 160).');
    }
    if (tipo === 'Diária') {
      throw new Error('"cargaHorariaFixaEmHoras" só vale para o tipo Mensal; o SGE a limpa no tipo Diária.');
    }
  }

  const horario24Horas = booleano(options.horario24Horas, 'horario24Horas');
  const fechamento = horaMinuto(options.horarioFechamentoNoturno, 'horarioFechamentoNoturno');
  if (fechamento && horario24Horas) {
    throw new Error('"horarioFechamentoNoturno" fica desabilitado quando "horario24Horas" é verdadeiro.');
  }

  const exibirHoraDiurnaReduzida = booleano(options.exibirHoraDiurnaReduzida, 'exibirHoraDiurnaReduzida');
  const exibirHoraNoturnaReduzida = booleano(options.exibirHoraNoturnaReduzida, 'exibirHoraNoturnaReduzida');
  if (!exibirHoraDiurnaReduzida && options.horaDiurnaReduzida) {
    throw new Error('"horaDiurnaReduzida" exige "exibirHoraDiurnaReduzida": true.');
  }
  if (!exibirHoraNoturnaReduzida && options.horaNoturnaReduzida) {
    throw new Error('"horaNoturnaReduzida" exige "exibirHoraNoturnaReduzida": true.');
  }

  return {
    descricao,
    tipo: tipo as TipoCargaHorariaHorario,
    colunaRefeicao: colunaRefeicao as ColunaRefeicaoHorario,
    cargaHorariaFixaEmHoras: cargaFixa,
    horarioFechamentoNoturno: fechamento,
    horario24Horas,
    habilitarBatidasPreAssinaladas: booleano(options.habilitarBatidasPreAssinaladas, 'habilitarBatidasPreAssinaladas'),
    preencherFolgaEmBranco: booleano(options.preencherFolgaEmBranco, 'preencherFolgaEmBranco'),
    bancoDeHoras: booleano(options.bancoDeHoras, 'bancoDeHoras'),
    horaExtra: booleano(options.horaExtra, 'horaExtra'),
    adicionalNoturno: booleano(options.adicionalNoturno, 'adicionalNoturno'),
    exibirHoraDiurnaReduzida,
    horaDiurnaReduzida: exibirHoraDiurnaReduzida
      ? horaReduzida(options.horaDiurnaReduzida, 'horaDiurnaReduzida', HORA_DIURNA_REDUZIDA_PADRAO)
      : undefined,
    exibirHoraNoturnaReduzida,
    horaNoturnaReduzida: exibirHoraNoturnaReduzida
      ? horaReduzida(options.horaNoturnaReduzida, 'horaNoturnaReduzida', HORA_NOTURNA_REDUZIDA_PADRAO)
      : undefined,
    jornada: jornadaValida(options.jornada, tipo as TipoCargaHorariaHorario),
    horasExtras: horasExtrasValidas(options.horasExtras),
    colunas: colunasValidas(options.colunas),
    sequencia,
  };
}

export function isHorarioQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
