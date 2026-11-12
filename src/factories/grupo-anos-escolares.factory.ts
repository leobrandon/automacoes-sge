export interface GrupoAnosEscolaresDados {
  descricao: string;
  tipoTurma: string;
  localizacao: string;
  energia: string;
  atendimento: string;
  origem: string;
  turno: string;
  composicao: string;
}
export function buildGrupoAnosEscolares(
  d: GrupoAnosEscolaresDados,
  sequencia: number,
): GrupoAnosEscolaresDados {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) throw new Error('Sequência inválida.');
  const descricao = `${d.descricao.trim() || 'QAAUTO Grupo de Anos Escolares'} ${sequencia}`;
  if (!/^QAAUTO\b/i.test(descricao)) throw new Error('Descrição deve começar com QAAUTO.');
  for (const campo of [
    'tipoTurma',
    'localizacao',
    'energia',
    'atendimento',
    'origem',
    'turno',
    'composicao',
  ] as const)
    if (!d[campo].trim()) throw new Error(`Informe ${campo} no JSON.`);
  return { ...d, descricao };
}
