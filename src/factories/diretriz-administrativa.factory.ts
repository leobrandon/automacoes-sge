export interface DiretrizAdministrativaDados {
  /** Unidade exatamente como aparece no select (ex.: "ESCOLA MUNICIPAL CULTURA"; o sufixo " - código" é ignorado). */
  unidade: string;
  funcao: string;
  cargo: string;
  /** Valor do select de turno (ex.: "Vespertino"; a grade mostra "Vespertino/Tarde"). */
  turno: string;
  departamento: string;
  horasSemanais: string;
  vagas: string;
}

/**
 * O formulário de diretriz não tem campo de texto livre, então não há como marcar o registro com QAAUTO.
 * A automação o identifica pela combinação unidade/função/cargo/turno/horas/vagas e nunca altera outra linha.
 */
export function buildDiretrizAdministrativa(d: DiretrizAdministrativaDados): DiretrizAdministrativaDados {
  for (const k of ['unidade', 'funcao', 'cargo', 'turno', 'departamento', 'horasSemanais', 'vagas'] as const) {
    if (typeof d[k] !== 'string' || !d[k].trim()) throw new Error(`Informe ${k} nos dados de diretriz administrativa.`);
  }
  const r = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.trim()])) as unknown as DiretrizAdministrativaDados;
  if (!/^[1-9]\d*$/.test(r.horasSemanais)) throw new Error('horasSemanais deve ser um número inteiro maior que zero.');
  if (!/^[1-9]\d*$/.test(r.vagas)) throw new Error('vagas deve ser um número inteiro maior que zero.');
  return r;
}

export type AlvoDiretrizAdministrativa = DiretrizAdministrativaDados;
