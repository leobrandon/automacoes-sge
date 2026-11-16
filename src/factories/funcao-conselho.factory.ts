import { TIPOS_MEMBRO_CONSELHO, type TipoMembroConselho } from './conselho-escolar.factory';

export const OPCOES_ATIVO_FUNCAO_CONSELHO = ['Sim', 'Não'] as const;
export type OpcaoAtivoFuncaoConselho = typeof OPCOES_ATIVO_FUNCAO_CONSELHO[number];

export interface FuncaoConselhoData {
  descricao: string;
  tipos: TipoMembroConselho[];
  idadeMinima: number;
  ativo: OpcaoAtivoFuncaoConselho;
}

export type BuildFuncaoConselhoOptions = Partial<FuncaoConselhoData>;

/** Descrição com até 150 caracteres (maxlength do campo); a sequência entra como sufixo. */
export function buildFuncaoConselho(options: BuildFuncaoConselhoOptions = {}, sequencia = 1): FuncaoConselhoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência da Função do Conselho Escolar deve ser um inteiro positivo.');
  }

  const base = options.descricao?.trim() || 'QAAUTO Função Conselho';
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('A descrição da Função do Conselho Escolar deve começar com QAAUTO.');
  }
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > 150) {
    throw new Error('A descrição da Função do Conselho Escolar deve ter até 150 caracteres.');
  }

  const tipos = options.tipos?.length ? options.tipos : (['Aluno', 'Comunidade'] as TipoMembroConselho[]);
  for (const tipo of tipos) {
    if (!TIPOS_MEMBRO_CONSELHO.includes(tipo)) {
      throw new Error(`Tipo de membro inválido "${tipo}". Opções: ${TIPOS_MEMBRO_CONSELHO.join(', ')}.`);
    }
  }

  const idadeMinima = options.idadeMinima ?? 18;
  if (!Number.isSafeInteger(idadeMinima) || idadeMinima < 1 || idadeMinima > 99) {
    throw new Error('A idade mínima da função deve ser um inteiro de 1 a 99 (o campo aceita 2 dígitos).');
  }

  return { descricao, tipos: [...tipos], idadeMinima, ativo: options.ativo || 'Sim' };
}

export function isFuncaoConselhoQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}

/** Texto exibido na coluna "Tipo(s) de Membro" da grade, na ordem alfabética do SGE. */
export function tiposExibidosFuncaoConselho(tipos: readonly TipoMembroConselho[]): string {
  return [...TIPOS_MEMBRO_CONSELHO].filter((tipo) => tipos.includes(tipo)).join(', ');
}
