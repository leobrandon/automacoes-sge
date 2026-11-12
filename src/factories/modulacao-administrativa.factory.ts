export interface ModulacaoAdministrativaDados {
  /** Unidade exatamente como aparece no select (ex.: "ESCOLA MUNICIPAL CULTURA"; o sufixo " - código" é ignorado). */
  unidade: string;
  /** Filtro de turno da diretriz: sem ele a tela não lista as vagas. */
  turno: string;
  funcao: string;
  cargo: string;
  /** Servidor de apoio (pré-condição do tenant). Deve conter QAAUTO. */
  colaborador: string;
  /** Número da matrícula do contrato (ex.: "225365"). */
  contrato: string;
  departamento: string;
  dataInicio: string;
  /** Observação da modulação. Deve começar com QAAUTO. */
  observacao: string;
}

export function buildModulacaoAdministrativa(d: ModulacaoAdministrativaDados): ModulacaoAdministrativaDados {
  for (const k of ['unidade', 'turno', 'funcao', 'cargo', 'colaborador', 'contrato', 'departamento', 'dataInicio', 'observacao'] as const) {
    if (typeof d[k] !== 'string' || !d[k].trim()) throw new Error(`Informe ${k} nos dados de modulação administrativa.`);
  }
  if (!/QAAUTO/i.test(d.colaborador)) throw new Error('O servidor de apoio deve conter QAAUTO: a automação só modula servidores de teste.');
  if (!/^QAAUTO\b/i.test(d.observacao)) throw new Error('A observação deve começar com QAAUTO.');
  if (!/^\d+$/.test(d.contrato.trim())) throw new Error('contrato deve ser o número da matrícula (somente dígitos).');
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(d.dataInicio)) throw new Error('dataInicio deve estar em DD/MM/AAAA.');
  return Object.fromEntries(Object.entries(d).map(([k, v]) => [k, v.trim()])) as unknown as ModulacaoAdministrativaDados;
}

export type AlvoModulacaoAdministrativa = Pick<ModulacaoAdministrativaDados, 'unidade' | 'turno' | 'funcao' | 'cargo' | 'colaborador' | 'contrato' | 'departamento'>;
