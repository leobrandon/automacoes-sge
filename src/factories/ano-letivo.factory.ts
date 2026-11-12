export interface AnoLetivoDados {
  /** Ano com 4 dígitos. Deve ser posterior ao ano corrente: o corrente/anteriores são dados reais da rede. */
  ano: string;
  /** Formato exibido pelo SGE, ex.: "70,00" (máscara de centavos). */
  metaAproveitamento: string;
  /** Formato exibido pelo SGE, ex.: "7,0" (máscara com uma casa decimal). */
  metaMedia: string;
}

/**
 * O cadastro não tem campo de texto, logo não aceita prefixo QAAUTO. A segurança vem de:
 * ano futuro (nunca o corrente), "Padrão" nunca marcado e exclusão apenas do ano criado pela execução.
 */
export function buildAnoLetivo(d: AnoLetivoDados, anoCorrente = new Date().getFullYear()): AnoLetivoDados {
  const ano = d.ano.trim();
  if (!/^\d{4}$/.test(ano)) throw new Error('ano deve ter 4 dígitos.');
  if (Number(ano) <= anoCorrente) throw new Error(`ano ${ano} não é posterior ao ano corrente (${anoCorrente}); o SGE rejeita anos retroativos e o corrente é dado real.`);
  const metaAproveitamento = d.metaAproveitamento.trim();
  const metaMedia = d.metaMedia.trim();
  if (!/^(100,00|\d{1,2},\d{2})$/.test(metaAproveitamento)) throw new Error('metaAproveitamento deve estar no formato 70,00 (0 a 100).');
  if (!/^\d{1,3},\d$/.test(metaMedia)) throw new Error('metaMedia deve estar no formato 7,0.');
  return {ano, metaAproveitamento, metaMedia};
}

/** As máscaras de meta são de dígitos: digitar "7000" produz "70,00" e "70" produz "7,0". */
export const digitosDaMascara = (valor: string): string => valor.replace(/\D/g, '');
