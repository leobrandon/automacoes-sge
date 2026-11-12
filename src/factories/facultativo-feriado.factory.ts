/** Limite observado na UI: acima de 250 caracteres o SGE rejeita a descrição. */
export const LIMITE_DESCRICAO_FACULTATIVO_FERIADO = 250;
/** Primeira data usada quando o JSON não informa uma; cada sequência avança um dia. */
export const DATA_BASE_FACULTATIVO_FERIADO = '01/03/2030';

export interface FacultativoFeriadoData {
  descricao: string;
  /** DD/MM/AAAA. O SGE aceita uma única entrada por data. */
  data: string;
  facultativo: boolean;
  sequencia: number;
}

export interface BuildFacultativoFeriadoOptions {
  descricao?: string;
  data?: string;
  facultativo?: boolean;
}

function lerData(texto: string): Date {
  const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
  if (!partes) {
    throw new Error(`A data "${texto}" deve estar no formato DD/MM/AAAA.`);
  }
  const [dia, mes, ano] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) {
    throw new Error(`A data "${texto}" não existe no calendário.`);
  }
  return data;
}

function formatarData(data: Date): string {
  const dia = String(data.getUTCDate()).padStart(2, '0');
  const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${data.getUTCFullYear()}`;
}

/** Soma dias a uma data DD/MM/AAAA de forma determinística (sem fuso horário). */
export function somarDiasFacultativoFeriado(data: string, dias: number): string {
  const base = lerData(data);
  base.setUTCDate(base.getUTCDate() + dias);
  return formatarData(base);
}

export function buildFacultativoFeriado(
  options: BuildFacultativoFeriadoOptions = {},
  sequencia = 1,
): FacultativoFeriadoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência do Feriado/Facultativo deve ser um inteiro positivo.');
  }

  const facultativo = options.facultativo ?? false;
  if (typeof facultativo !== 'boolean') {
    throw new Error('O indicador Facultativo deve ser booleano.');
  }

  const base = options.descricao?.trim() || (facultativo ? 'QAAUTO Facultativo' : 'QAAUTO Feriado');
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição do Feriado/Facultativo deve começar com "QAAUTO".');
  }

  const descricao = `${base} ${sequencia}`;
  if (descricao.length > LIMITE_DESCRICAO_FACULTATIVO_FERIADO) {
    throw new Error(
      `A descrição do Feriado/Facultativo deve ter no máximo ${LIMITE_DESCRICAO_FACULTATIVO_FERIADO} caracteres.`,
    );
  }

  const dataBase = options.data?.trim() || DATA_BASE_FACULTATIVO_FERIADO;
  const data = somarDiasFacultativoFeriado(dataBase, sequencia - 1);

  return { descricao, data, facultativo, sequencia };
}

export function isFacultativoFeriadoQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
