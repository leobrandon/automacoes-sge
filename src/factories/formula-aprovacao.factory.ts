export interface FormulaAprovacaoDados {
  descricao: string;
  frequenciaMinima: string;
  arredondamento: string;
  conselhoClasse: string;
  lancamentos: string;
  formulaAprovacao: string;
  formulaConceitoFinal: string;
  casasDecimais: string;
  notaMaximaMediaFinal: string;
  mediaAprovacao: string;
  quantidadeDisciplinasRecuperacao: string;
}

const TEXTOS = [
  'descricao',
  'frequenciaMinima',
  'arredondamento',
  'conselhoClasse',
  'lancamentos',
  'formulaAprovacao',
  'formulaConceitoFinal',
  'casasDecimais',
  'notaMaximaMediaFinal',
  'mediaAprovacao',
  'quantidadeDisciplinasRecuperacao',
] as const;

export const isFormulaAprovacaoQAAuto = (descricao: string): boolean =>
  /^QAAUTO\b/i.test(descricao.trim());

export function buildFormulaAprovacao(
  dados: FormulaAprovacaoDados,
  sequencia = 1,
): FormulaAprovacaoDados {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) throw new Error('Sequência inválida.');
  for (const campo of TEXTOS)
    if (typeof dados[campo] !== 'string' || !dados[campo].trim())
      throw new Error(`Informe "${campo}" em dados_formula_aprovacao.json.`);
  const d = Object.fromEntries(TEXTOS.map((c) => [c, dados[c].trim()])) as unknown as FormulaAprovacaoDados;
  if (!isFormulaAprovacaoQAAuto(d.descricao)) throw new Error('A descrição deve começar com QAAUTO.');
  d.descricao = `${d.descricao} ${sequencia}`;
  if (d.descricao.length > 250) throw new Error('A descrição deve ter até 250 caracteres.');
  if (!/^\d{1,3}$/.test(d.frequenciaMinima) || +d.frequenciaMinima > 100)
    throw new Error('A frequência mínima deve ser um número de 0 a 100.');
  for (const campo of ['notaMaximaMediaFinal', 'mediaAprovacao'] as const)
    if (!/^\d{1,3}$/.test(d[campo]) || +d[campo] > 100)
      throw new Error(`"${campo}" deve ser um número de 0 a 100.`);
  if (!/^\d{1,2}$/.test(d.quantidadeDisciplinasRecuperacao))
    throw new Error('A quantidade de disciplinas para recuperação deve ter até 2 dígitos.');
  if (!d.formulaConceitoFinal.includes('/'))
    throw new Error('A fórmula do Conceito Final precisa conter uma divisão (ENS-FA-002).');
  return d;
}
