const LIMITE_NOME = 128;

export interface LocalAlmoxarifadoData {
  nome: string;
  telefone: string;
  responsavel: string;
  sequencia: number;
}

export type BuildLocalAlmoxarifadoOptions = Partial<Omit<LocalAlmoxarifadoData, 'sequencia'>>;

/** Nome `QAAUTO <base> <sequência>`; Telefone e Responsável são obrigatórios na tela. */
export function buildLocalAlmoxarifado(
  options: BuildLocalAlmoxarifadoOptions = {},
  sequencia = 1,
): LocalAlmoxarifadoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Local deve ser um inteiro positivo.');
  }

  const base = options.nome?.trim() || 'QAAUTO Local Almoxarifado';
  if (!isLocalAlmoxarifadoQAAuto(base)) {
    throw new Error('O nome de Local deve começar com QAAUTO.');
  }
  const nome = `${base} ${sequencia}`;
  if (nome.length > LIMITE_NOME) {
    throw new Error(`O nome de Local deve ter até ${LIMITE_NOME} caracteres.`);
  }

  const telefone = options.telefone?.trim() || '(11) 98765-4321';
  if (!/^\(\d{2}\) \d{4,5}-\d{4}$/.test(telefone)) {
    throw new Error('O telefone de Local deve seguir o formato (99) 99999-9999.');
  }

  return {
    nome,
    telefone,
    responsavel: options.responsavel?.trim() || 'QAAUTO Responsavel',
    sequencia,
  };
}

export function isLocalAlmoxarifadoQAAuto(nome: string): boolean {
  return /^QAAUTO\b/i.test(nome.trim());
}
