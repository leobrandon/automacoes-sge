import fs from 'node:fs';
import path from 'node:path';
import type {
  CalendarioAnoComposicaoOpcoes,
  CalendarioComposicaoOpcoes,
  CalendarioEscolarOpcoes,
} from '../../../src/factories/calendario-escolar.factory';
function ler(nome: string): Record<string, unknown> {
  const x: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!x || typeof x !== 'object' || Array.isArray(x))
    throw new Error(`${nome} deve conter um objeto.`);
  return x as Record<string, unknown>;
}
function lerComposicoes(valor: unknown): CalendarioComposicaoOpcoes[] {
  if (!Array.isArray(valor) || valor.length === 0)
    throw new Error('Informe "composicoes" com ao menos 3 Composições de Ensino.');
  return valor.map((item, indice) => {
    if (!item || typeof item !== 'object' || Array.isArray(item))
      throw new Error(`A composição ${indice + 1} deve ser um objeto.`);
    const c = item as Record<string, unknown>;
    const textos = ['composicao', 'tipoAtendimento', 'periodicidade', 'materiaEscolar', 'origemCargaHoraria'] as const;
    for (const campo of textos)
      if (typeof c[campo] !== 'string' || !(c[campo] as string).trim())
        throw new Error(`Informe "${campo}" na composição ${indice + 1}.`);
    if (c.formulaAprovacao != null && typeof c.formulaAprovacao !== 'string')
      throw new Error(`"formulaAprovacao" da composição ${indice + 1} deve ser texto.`);
    let anoComposicao: CalendarioAnoComposicaoOpcoes | undefined;
    if (c.anoComposicao != null) {
      if (!c.anoComposicao || typeof c.anoComposicao !== 'object' || Array.isArray(c.anoComposicao))
        throw new Error(`"anoComposicao" da composição ${indice + 1} deve ser um objeto.`);
      const ano = c.anoComposicao as Record<string, unknown>;
      for (const campo of [
        'anoEscolar',
        'tipoDiario',
        'formaAvaliacao',
        'anoEscolarDestino',
        'fichaAvaliativa',
      ] as const)
        if (typeof ano[campo] !== 'string' || !(ano[campo] as string).trim())
          throw new Error(`Informe "${campo}" no ano da composição ${indice + 1}.`);
      if (ano.tipoObservacoesFichaAvaliativa != null && typeof ano.tipoObservacoesFichaAvaliativa !== 'string')
        throw new Error(`"tipoObservacoesFichaAvaliativa" da composição ${indice + 1} deve ser texto.`);
      if (ano.tipoParecerFinalFichaAvaliativa != null && typeof ano.tipoParecerFinalFichaAvaliativa !== 'string')
        throw new Error(`"tipoParecerFinalFichaAvaliativa" da composição ${indice + 1} deve ser texto.`);
      if (ano.observacaoDiarioClasse != null && typeof ano.observacaoDiarioClasse !== 'string')
        throw new Error(`"observacaoDiarioClasse" da composição ${indice + 1} deve ser texto.`);
      if (!Array.isArray(ano.componentesCurriculares) || ano.componentesCurriculares.length < 2)
        throw new Error(`Informe ao menos 2 "componentesCurriculares" na composição ${indice + 1}.`);
      const componentesCurriculares = ano.componentesCurriculares.map((item, itemIndice) => {
        if (!item || typeof item !== 'object' || Array.isArray(item))
          throw new Error(`O componente ${itemIndice + 1} da composição ${indice + 1} deve ser um objeto.`);
        const componente = item as Record<string, unknown>;
        for (const campo of [
          'componente',
          'cargaHoraria',
          'quantidadeAulasSemanais',
          'quantidadeAulasPresenciais',
          'quantidadeAulasNaoPresenciais',
          'formaAvaliacao',
        ] as const)
          if (typeof componente[campo] !== 'string' || !(componente[campo] as string).trim())
            throw new Error(`Informe "${campo}" no componente ${itemIndice + 1} da composição ${indice + 1}.`);
        return {
          componente: (componente.componente as string).trim(),
          cargaHoraria: componente.cargaHoraria as string,
          quantidadeAulasSemanais: componente.quantidadeAulasSemanais as string,
          quantidadeAulasPresenciais: componente.quantidadeAulasPresenciais as string,
          quantidadeAulasNaoPresenciais: componente.quantidadeAulasNaoPresenciais as string,
          formaAvaliacao: (componente.formaAvaliacao as string).trim(),
        };
      });
      anoComposicao = {
        anoEscolar: (ano.anoEscolar as string).trim(),
        tipoDiario: (ano.tipoDiario as string).trim(),
        formaAvaliacao: (ano.formaAvaliacao as string).trim(),
        anoEscolarDestino: (ano.anoEscolarDestino as string).trim(),
        fichaAvaliativa: (ano.fichaAvaliativa as string).trim(),
        tipoObservacoesFichaAvaliativa:
          typeof ano.tipoObservacoesFichaAvaliativa === 'string'
            ? ano.tipoObservacoesFichaAvaliativa.trim()
            : undefined,
        tipoParecerFinalFichaAvaliativa:
          typeof ano.tipoParecerFinalFichaAvaliativa === 'string'
            ? ano.tipoParecerFinalFichaAvaliativa.trim()
            : undefined,
        observacaoDiarioClasse:
          typeof ano.observacaoDiarioClasse === 'string'
            ? ano.observacaoDiarioClasse.trim()
            : undefined,
        componentesCurriculares,
      };
    }
    return {
      composicao: (c.composicao as string).trim(),
      tipoAtendimento: c.tipoAtendimento as CalendarioComposicaoOpcoes['tipoAtendimento'],
      periodicidade: c.periodicidade as CalendarioComposicaoOpcoes['periodicidade'],
      materiaEscolar: c.materiaEscolar as CalendarioComposicaoOpcoes['materiaEscolar'],
      origemCargaHoraria: c.origemCargaHoraria as CalendarioComposicaoOpcoes['origemCargaHoraria'],
      formulaAprovacao: typeof c.formulaAprovacao === 'string' ? c.formulaAprovacao.trim() : '',
      anoComposicao,
    };
  });
}
export function configCalendarioEscolar(): { quantidade: number; dados: CalendarioEscolarOpcoes } {
  const x = ler('dados_calendario_escolar.json');
  const q = x.quantidade == null || x.quantidade === '' ? 1 : Number(x.quantidade);
  if (
    !Number.isSafeInteger(q) ||
    q < 1 ||
    typeof x.descricao !== 'string' ||
    typeof x.anoLetivo !== 'string' ||
    !x.datas ||
    typeof x.datas !== 'object' ||
    Array.isArray(x.datas)
  )
    throw new Error('Configuração de calendário inválida.');
  for (const v of Object.values(x.datas))
    if (typeof v !== 'string') throw new Error('Datas devem ser textos.');
  return {
    quantidade: q,
    dados: {
      descricao: x.descricao,
      anoLetivo: x.anoLetivo,
      datas: x.datas as Record<string, string>,
      composicoes: lerComposicoes(x.composicoes),
    },
  };
}

/** Dados de calendário para cenários que exercitam apenas a exclusão do calendário. */
export function dadosCalendarioSemAnoComposicao(
  dados: CalendarioEscolarOpcoes,
): CalendarioEscolarOpcoes {
  return {
    ...dados,
    composicoes: dados.composicoes.map(({ anoComposicao: _ano, ...composicao }) => composicao),
  };
}

export function configExclusaoCalendarioEscolar(): {
  excluirTodosQAAUTO: boolean;
  descricao: string;
} {
  const x = ler('dados_exclusao_calendario_escolar.json');
  if (typeof x.excluirTodosQAAUTO !== 'boolean')
    throw new Error('Informe excluirTodosQAAUTO como true ou false.');
  if (typeof x.descricao !== 'string')
    throw new Error('A descrição deve ser texto.');
  const descricao = x.descricao.trim();
  if (!x.excluirTodosQAAUTO && !/^QAAUTO\b/i.test(descricao)) {
    throw new Error('Informe a descrição QAAUTO exata para exclusão individual.');
  }
  return { excluirTodosQAAUTO: x.excluirTodosQAAUTO, descricao };
}
