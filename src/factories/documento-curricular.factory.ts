export type OpcaoSimNaoDocumentoCurricular = 'Sim' | 'Não';

export interface ItemEstruturaDocumentoCurricular {
  descricao: string;
  ativo: OpcaoSimNaoDocumentoCurricular;
  codigo?: string;
  descricaoItemPai?: string;
}

export interface EstruturaDocumentoCurricular {
  descricao: string;
  possuiCodigo: OpcaoSimNaoDocumentoCurricular;
  ativo: OpcaoSimNaoDocumentoCurricular;
  itens: ItemEstruturaDocumentoCurricular[];
}

export interface DocumentoCurricularData {
  descricao: string;
  composicaoEnsino: string;
  anoEscolar: string;
  componente: string;
  componentes: string[];
  componenteAlternativo?: string;
  ativo: OpcaoSimNaoDocumentoCurricular;
  estruturas: EstruturaDocumentoCurricular[];
}

export type BuildDocumentoCurricularOptions = Partial<DocumentoCurricularData>;

function qAAutoDescricao(texto: string | undefined, padrao: string): string {
  const descricao = texto?.trim() || padrao;
  if (!/^QAAUTO\b/i.test(descricao)) {
    throw new Error('As descrições da automação devem começar com "QAAUTO".');
  }
  return descricao;
}

function sequenciarDescricao(descricao: string | undefined, padrao: string, sequencia: number): string {
  const base = qAAutoDescricao(descricao, padrao);
  if (/\s\d+$/.test(base)) return base;
  return `${base} ${sequencia}`;
}

function simNao(valor: string | undefined, campo: string, padrao: OpcaoSimNaoDocumentoCurricular): OpcaoSimNaoDocumentoCurricular {
  const escolhido = valor?.trim();
  if (!escolhido) return padrao;
  if (escolhido !== 'Sim' && escolhido !== 'Não') {
    throw new Error(`Valor "${escolhido}" inválido para "${campo}". Use Sim ou Não.`);
  }
  return escolhido;
}

export function buildDocumentoCurricular(
  options: BuildDocumentoCurricularOptions = {},
  sequencia = 1,
): DocumentoCurricularData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error('A sequência do Documento Curricular deve ser um inteiro positivo.');
  }

  const descricao = sequenciarDescricao(options.descricao, 'QAAUTO Documento Curricular', sequencia);
  const estruturas = options.estruturas !== undefined ? options.estruturas : [
    {
      descricao: 'QAAUTO Estrutura Curricular 1', possuiCodigo: 'Sim', ativo: 'Sim',
      itens: [{ descricao: 'QAAUTO Item Curricular 1', codigo: '001', ativo: 'Sim' }],
    },
    {
      descricao: 'QAAUTO Estrutura Curricular 2', possuiCodigo: 'Não', ativo: 'Sim',
      itens: [{
        descricao: 'QAAUTO Item Curricular 2', descricaoItemPai: 'QAAUTO Item Curricular 1', ativo: 'Sim',
      }],
    },
  ];
  const descricoesResolvidas = new Map<string, string>();
  const itensAnteriores: ItemEstruturaDocumentoCurricular[][] = [];
  const estruturasNormalizadas = estruturas.map((estrutura, indice) => {
    const descricaoEstrutura = sequenciarDescricao(
      estrutura.descricao,
      `QAAUTO Estrutura Curricular ${indice + 1}`,
      sequencia,
    );
    if (!estrutura.itens?.length) throw new Error(`A estrutura "${descricaoEstrutura}" precisa de ao menos um item.`);
    const possuiCodigo = simNao(estrutura.possuiCodigo, `estruturas[${indice}].possuiCodigo`, 'Não');
    const itens = estrutura.itens.map((item, indiceItem) => {
      const descricaoItem = sequenciarDescricao(
        item.descricao,
        `QAAUTO Item Curricular ${indice + 1}-${indiceItem + 1}`,
        sequencia,
      );
      if (possuiCodigo === 'Sim' && !item.codigo?.trim()) {
        throw new Error(`O item "${descricaoItem}" precisa de código porque a estrutura possui código.`);
      }
      if (possuiCodigo === 'Não' && item.codigo?.trim()) {
        throw new Error(`O item "${descricaoItem}" não deve ter código porque a estrutura não possui código.`);
      }
      const descricaoItemPai = item.descricaoItemPai?.trim()
        ? descricoesResolvidas.get(item.descricaoItemPai.trim()) || item.descricaoItemPai.trim()
        : indice > 0 ? itensAnteriores[indice - 1]?.[0]?.descricao : undefined;
      if (indice > 0 && !descricaoItemPai) {
        throw new Error(`O item "${descricaoItem}" precisa referenciar a descrição de um item da estrutura anterior.`);
      }
      descricoesResolvidas.set(item.descricao.trim(), descricaoItem);
      return {
        ...item,
        descricao: descricaoItem,
        ...(descricaoItemPai ? { descricaoItemPai } : {}),
        ativo: simNao(item.ativo, `estruturas[${indice}].itens[${indiceItem}].ativo`, 'Sim'),
      };
    });
    itensAnteriores[indice] = itens;
    return {
      descricao: descricaoEstrutura,
      possuiCodigo,
      ativo: simNao(estrutura.ativo, `estruturas[${indice}].ativo`, 'Sim'),
      itens,
    };
  });

  if (descricao.length > 200) throw new Error('A descrição do Documento Curricular deve ter até 200 caracteres.');
  const componentes = options.componentes === undefined || options.componentes.length === 0
    ? [options.componente?.trim() || 'ARTES']
    : options.componentes.map(nome => {
      if (typeof nome !== 'string' || !nome.trim()) throw new Error('Os componentes devem conter nomes preenchidos.');
      return nome.trim();
    });
  if (new Set(componentes.map(nome => nome.toLocaleUpperCase('pt-BR'))).size !== componentes.length) {
    throw new Error('A lista de componentes não pode conter nomes repetidos.');
  }
  return {
    descricao,
    composicaoEnsino: options.composicaoEnsino?.trim() || 'ENSINO MÉDIO INOVADOR',
    anoEscolar: options.anoEscolar?.trim() || '2° SÉRIE',
    componente: componentes[0],
    componentes,
    componenteAlternativo: options.componenteAlternativo?.trim() || undefined,
    ativo: simNao(options.ativo, 'ativo', 'Sim'),
    estruturas: estruturasNormalizadas,
  };
}

export function isDocumentoCurricularQAAuto(descricao: string): boolean {
  return /^QAAUTO\b/i.test(descricao.trim());
}
