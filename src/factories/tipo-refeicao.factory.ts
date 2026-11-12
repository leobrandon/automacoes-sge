export function buildTipoRefeicao(nome = '', sequencia = 1): string {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) throw new Error('Sequência inválida.');
  const base = nome.trim() || 'QAAUTO Tipo de Refeição';
  if (!/^QAAUTO\b/i.test(base)) throw new Error('Nome deve começar com QAAUTO.');
  const resultado = `${base} ${sequencia}`;
  if (resultado.length > 100) throw new Error('Nome deve ter até 100 caracteres.');
  return resultado;
}
