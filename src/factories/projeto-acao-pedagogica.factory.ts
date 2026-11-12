export interface ProjetoPedagogicoDados {
  escola: string;
  tenant: string;
  anoLetivo: string;
  periodo: string;
}
export function validarProjetoPedagogico(d: ProjetoPedagogicoDados): ProjetoPedagogicoDados {
  for (const campo of ['escola', 'tenant', 'anoLetivo', 'periodo'] as const)
    if (!d[campo]?.trim()) throw new Error(`Informe ${campo} no JSON.`);
  return d;
}
