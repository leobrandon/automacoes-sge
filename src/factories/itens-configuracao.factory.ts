/** Monta "QAAUTO <nome> <sequência>" respeitando o limite de caracteres do campo. */
export function montarDescricaoQaauto(
  base: string | undefined,
  padrao: string,
  sequencia: number,
  maximo: number,
  rotulo: string,
): string {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) {
    throw new Error(`A sequência de ${rotulo} deve ser um inteiro positivo.`);
  }
  const prefixo = base?.trim() || padrao;
  if (!/^QAAUTO\s+\S/.test(prefixo)) {
    throw new Error(`${rotulo} deve começar com "QAAUTO " (recebido: "${prefixo}").`);
  }
  const texto = `${prefixo} ${sequencia}`;
  if (texto.length > maximo) {
    throw new Error(`${rotulo} "${texto}" excede ${maximo} caracteres.`);
  }
  return texto;
}
