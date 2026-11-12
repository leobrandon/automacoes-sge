import fs from 'node:fs';
import path from 'node:path';
import {camposNutricionais, type NecessidadeNutricionalDados} from '../../../src/factories/necessidade-nutricional.factory';
import type {NecessidadeCriada} from '../../../src/actions/criar-necessidade-nutricional.action';

function ler(nome: string): Record<string, unknown> {
  const x: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error(`${nome} deve ser objeto.`);
  return x as Record<string, unknown>;
}

export function configNecessidade(): NecessidadeNutricionalDados {
  const x = ler('dados_necessidade_nutricional.json');
  // A combinação resolução + grupo + atendimento é única no SGE; por isso não há campo de quantidade.
  for (const k of ['resolucao', 'grupo', 'atendimento', ...camposNutricionais]) if (typeof x[k] !== 'string') throw new Error(`${k} deve ser texto.`);
  return x as unknown as NecessidadeNutricionalDados;
}

export function configExclusaoNecessidade(): NecessidadeCriada {
  const x = ler('dados_exclusao_necessidade_nutricional.json');
  if (x.excluirTodosQAAUTO !== false) throw new Error('Exclusão geral não é suportada: use excluirTodosQAAUTO=false.');
  for (const k of ['resolucao', 'grupo', 'atendimento']) if (typeof x[k] !== 'string' || !(x[k] as string).trim()) throw new Error(`Informe ${k} no JSON de exclusão.`);
  return {resolucao: (x.resolucao as string).trim(), grupo: (x.grupo as string).trim(), atendimento: (x.atendimento as string).trim()};
}
