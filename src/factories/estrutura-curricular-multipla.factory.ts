export interface GradeCurricular {
  anoEscolar: string;
  componente: string;
  cargaHoraria: string;
  aulasSemanais: string;
  aulasPresenciais: string;
  aulasNaoPresenciais: string;
}

export interface EstruturaCurricularDados {
  descricao: string;
  nivel: string;
  tipo: string;
  dataResolucao: string;
  numeroResolucao: string;
  grades: GradeCurricular[];
}

export function buildEstruturaCurricular(
  dados: EstruturaCurricularDados,
  sequencia = 1,
): EstruturaCurricularDados {
  if (!Number.isSafeInteger(sequencia) || sequencia < 1) throw new Error('Sequência inválida.');
  const base = dados.descricao.trim() || 'QAAUTO Estrutura Curricular Múltipla';
  if (!/^QAAUTO\b/i.test(base)) throw new Error('A descrição deve começar com QAAUTO.');
  const descricao = `${base} ${sequencia}`;
  if (descricao.length > 200) throw new Error('A descrição deve ter até 200 caracteres.');
  if (
    !dados.nivel ||
    !dados.tipo ||
    !/^\d{2}\/\d{2}\/\d{4}$/.test(dados.dataResolucao) ||
    !dados.numeroResolucao ||
    !Array.isArray(dados.grades) ||
    !dados.grades.length
  )
    throw new Error('Informe nível, tipo, resolução e ao menos uma grade.');
  for (const grade of dados.grades) {
    if (
      !grade.anoEscolar ||
      !grade.componente ||
      !/^\d+$/.test(grade.cargaHoraria) ||
      !/^\d+$/.test(grade.aulasSemanais) ||
      !/^\d+$/.test(grade.aulasPresenciais) ||
      !/^\d+$/.test(grade.aulasNaoPresenciais)
    )
      throw new Error('Informe ano escolar, componente e quantidades numéricas para cada grade.');
    if (+grade.aulasPresenciais + +grade.aulasNaoPresenciais !== +grade.aulasSemanais)
      throw new Error(
        'A soma das aulas presenciais e não presenciais deve corresponder às aulas semanais.',
      );
  }
  return { ...dados, descricao };
}
