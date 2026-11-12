export interface ResolucaoData {
  descricao: string;
  anoLetivo: string;
  dataInicial: string;
}
export type BuildResolucaoOptions = Partial<ResolucaoData>;

export function buildResolucao(options: BuildResolucaoOptions = {}, sequencia = 1): ResolucaoData {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1)
    throw new Error('A sequência deve ser um inteiro positivo.');
  const base = options.descricao?.trim() || 'QAAUTO Resolução';
  if (!/^QAAUTO\b/i.test(base)) throw new Error('A descrição deve começar com QAAUTO.');
  const descricao = `${base} ${sequencia}`;
  if (descricao.length < 3 || descricao.length > 100)
    throw new Error('A descrição deve ter de 3 a 100 caracteres.');
  const anoLetivo = options.anoLetivo?.trim() || '';
  const dataInicial = options.dataInicial?.trim() || '';
  if (!/^\d{4}$/.test(anoLetivo))
    throw new Error('Informe um ano letivo de quatro dígitos no JSON.');
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dataInicial))
    throw new Error('Informe a data inicial em DD/MM/AAAA no JSON.');
  return { descricao, anoLetivo, dataInicial };
}
export const isResolucaoQAAuto = (descricao: string): boolean =>
  /^QAAUTO\b/i.test(descricao.trim());
