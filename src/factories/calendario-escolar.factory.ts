export interface CalendarioEscolarOpcoes {
  descricao: string;
  anoLetivo: string;
  datas: Record<string, string>;
}
export function buildCalendarioEscolar(
  opcoes: CalendarioEscolarOpcoes,
  sequencia = 1,
): CalendarioEscolarOpcoes {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1)
    throw new Error('Sequência deve ser inteira e positiva.');
  const base = opcoes.descricao.trim() || 'QAAUTO Calendário Escolar';
  if (!/^QAAUTO\b/i.test(base)) throw new Error('Descrição deve começar por QAAUTO.');
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > 100) throw new Error('Descrição deve ter até 100 caracteres.');
  if (!/^\d{4}$/.test(opcoes.anoLetivo))
    throw new Error('Informe o ano letivo com quatro dígitos.');
  const campos = [
    'InicioPrimeiroBimestre',
    'FimPrimeiroBimestre',
    'LimiteRegistroConteudoPrimeiroBimestre',
    'InicioSegundoBimestre',
    'FimSegundoBimestre',
    'LimiteRegistroConteudoSegundoBimestre',
    'InicioTerceiroBimestre',
    'FimTerceiroBimestre',
    'LimiteRegistroConteudoTerceiroBimestre',
    'InicioQuartoBimestre',
    'FimQuartoBimestre',
    'LimiteRegistroConteudoQuartoBimestre',
    'FimPrimeiroSemestre',
    'FimSegundoSemestre',
  ];
  for (const campo of campos)
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(opcoes.datas[campo] || ''))
      throw new Error(`Informe ${campo} em DD/MM/AAAA.`);
  return { ...opcoes, descricao };
}
