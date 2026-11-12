export interface GrupoAlimentoData {
  nome: string;
  descricao: string;
}

export type BuildGrupoAlimentoOptions = Partial<GrupoAlimentoData>;

/** Base do nome (sem sequência); o SGE recusa nomes repetidos. */
export function baseNomeGrupoAlimento(options: BuildGrupoAlimentoOptions = {}): string {
  const base = options.nome?.trim() || 'QAAUTO Grupo de Alimento';
  if (!/^QAAUTO\b/i.test(base)) {
    throw new Error('O nome do Grupo de Alimento deve começar com QAAUTO.');
  }
  return base;
}

export function buildGrupoAlimento(options: BuildGrupoAlimentoOptions = {}, sequencia = 1): GrupoAlimentoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência de Grupo de Alimento deve ser um inteiro positivo.');
  }

  const nome = `${baseNomeGrupoAlimento(options)} ${sequencia}`;
  if (nome.length > 128) {
    throw new Error('O nome do Grupo de Alimento deve ter até 128 caracteres.');
  }
  const descricao = options.descricao?.trim() || '';
  if (descricao.length > 1000) {
    throw new Error('A descrição do Grupo de Alimento deve ter até 1000 caracteres.');
  }

  return { nome, descricao };
}

export function isGrupoAlimentoQAAuto(nome: string): boolean {
  return /^QAAUTO\b/i.test(nome.trim());
}
