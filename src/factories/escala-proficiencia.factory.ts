export interface ParametroEscalaProficiencia {
  pontuacaoInicial: string;
  pontuacaoFinal: string;
  idadeAte?: string;
  dataAntes: string;
  idadeApartir?: string;
  dataApartir: string;
  equivalenciaSaida: string;
  concluiCorrecaoFluxo: boolean;
}

export interface EscalaProficienciaData {
  codigo: string;
  descricao: string;
  composicaoEnsino: string;
  ativo: boolean;
  parametros: ParametroEscalaProficiencia[];
}

export interface BuildEscalaProficienciaOptions {
  codigoInicial?: string;
  descricao?: string;
  composicaoEnsino?: string;
  ativo?: boolean;
  parametros?: ParametroEscalaProficiencia[];
}

function numero(valor: string, campo: string): number {
  const normalizado = valor.trim().replace(',', '.');
  if (!/^-?\d+(?:\.\d+)?$/.test(normalizado)) {
    throw new Error(`"${campo}" deve conter um valor numérico.`);
  }
  return Number(normalizado);
}

function diaMes(valor: string, campo: string): number {
  const correspondencia = /^(\d{2})\/(\d{2})$/.exec(valor.trim());
  if (!correspondencia) throw new Error(`"${campo}" deve usar o formato dd/MM.`);
  const dia = Number(correspondencia[1]);
  const mes = Number(correspondencia[2]);
  const data = new Date(Date.UTC(2024, mes - 1, dia));
  if (data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw new Error(`"${campo}" não contém uma data válida.`);
  }
  return mes * 100 + dia;
}

function validarParametros(parametros: ParametroEscalaProficiencia[]): void {
  const faixas: Array<{ inicial: number; final: number }> = [];
  for (const [indice, parametro] of parametros.entries()) {
    const inicial = numero(parametro.pontuacaoInicial, `parametros[${indice}].pontuacaoInicial`);
    const final = numero(parametro.pontuacaoFinal, `parametros[${indice}].pontuacaoFinal`);
    const idadeAte = parametro.idadeAte?.trim()
      ? numero(parametro.idadeAte, `parametros[${indice}].idadeAte`)
      : undefined;
    const idadeApartir = parametro.idadeApartir?.trim()
      ? numero(parametro.idadeApartir, `parametros[${indice}].idadeApartir`)
      : undefined;
    const dataAntes = diaMes(parametro.dataAntes, `parametros[${indice}].dataAntes`);
    const dataApartir = diaMes(parametro.dataApartir, `parametros[${indice}].dataApartir`);

    if (inicial > final) throw new Error('A pontuação inicial não pode superar a final.');
    if (idadeAte !== undefined && idadeApartir !== undefined && idadeAte > idadeApartir) {
      throw new Error('A idade “até” não pode superar a idade “a partir de”.');
    }
    if (dataAntes > dataApartir) throw new Error('A data “antes de” não pode ser posterior à data “a partir de”.');
    if (!parametro.equivalenciaSaida.trim()) throw new Error('Informe a equivalência para saída.');
    faixas.push({ inicial, final });
  }

  faixas.sort((a, b) => a.inicial - b.inicial);
  for (let indice = 1; indice < faixas.length; indice++) {
    if (faixas[indice].inicial <= faixas[indice - 1].final) {
      throw new Error('As faixas de pontuação não podem se sobrepor.');
    }
  }
}

export function buildEscalaProficiencia(
  options: BuildEscalaProficienciaOptions = {},
  codigo?: string,
): EscalaProficienciaData {
  const baseCodigo = (options.codigoInicial ?? '').trim();
  const codigoFinal = codigo ?? baseCodigo;
  if (!/^\d{1,19}$/.test(codigoFinal)) {
    throw new Error('O código da escala deve conter de 1 a 19 dígitos.');
  }

  const baseDescricao = options.descricao?.trim() || 'QAAUTO Escala de Proficiência';
  if (!/^QAAUTO\b/i.test(baseDescricao)) {
    throw new Error('A descrição da escala de teste deve começar com “QAAUTO”.');
  }
  const descricao = `${baseDescricao} ${codigoFinal}`;
  if (descricao.length > 300) throw new Error('A descrição deve ter até 300 caracteres.');

  const composicaoEnsino = options.composicaoEnsino?.trim() || '';
  if (!composicaoEnsino) throw new Error('Informe a composição de ensino.');

  const parametros = (options.parametros ?? []).map((parametro) => ({ ...parametro }));
  validarParametros(parametros);

  return {
    codigo: codigoFinal,
    descricao,
    composicaoEnsino,
    ativo: options.ativo ?? true,
    parametros,
  };
}

export function isEscalaProficienciaQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
