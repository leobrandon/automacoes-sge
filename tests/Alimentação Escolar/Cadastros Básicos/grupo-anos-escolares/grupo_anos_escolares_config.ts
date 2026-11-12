import fs from 'node:fs';
import path from 'node:path';
import type { GrupoAnosEscolaresDados } from '../../../../src/factories/grupo-anos-escolares.factory';
function ler(nome: string): Record<string, unknown> {
  const x: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error(`${nome} deve ser objeto.`);
  return x as Record<string, unknown>;
}
export function configGrupoAnos(): { quantidade: number; dados: GrupoAnosEscolaresDados } {
  const x = ler('dados_grupo_anos_escolares.json');
  const q = x.quantidade === '' || x.quantidade == null ? 1 : Number(x.quantidade);
  if (q !== 1)
    throw new Error(
      'Esta configuração admite quantidade 1: grupos com critérios iguais apresentam interseção.',
    );
  for (const k of [
    'descricao',
    'tipoTurma',
    'localizacao',
    'energia',
    'atendimento',
    'origem',
    'turno',
    'composicao',
  ])
    if (typeof x[k] !== 'string') throw new Error(`${k} deve ser texto.`);
  return { quantidade: q, dados: x as unknown as GrupoAnosEscolaresDados };
}
export function configExclusaoGrupoAnos(): string {
  const x = ler('dados_exclusao_grupo_anos_escolares.json');
  if (
    x.excluirTodosQAAUTO !== false ||
    typeof x.descricao !== 'string' ||
    !/^QAAUTO\b/i.test(x.descricao.trim())
  )
    throw new Error('Informe descrição QAAUTO exata e excluirTodosQAAUTO=false.');
  return x.descricao.trim();
}
