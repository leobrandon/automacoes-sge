import fs from 'node:fs';
import path from 'node:path';
function ler(nome: string): Record<string, unknown> {
  const x: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error(`${nome} deve ser objeto.`);
  return x as Record<string, unknown>;
}
export function configTipoRefeicao(): { quantidade: number; nome: string } {
  const x = ler('dados_tipo_refeicao.json');
  const q = x.quantidade === '' || x.quantidade == null ? 1 : Number(x.quantidade);
  if (!Number.isSafeInteger(q) || q < 1 || typeof x.nome !== 'string')
    throw new Error('Informe quantidade válida e nome textual.');
  return { quantidade: q, nome: x.nome };
}
export function configExclusaoTipoRefeicao(): string {
  const x = ler('dados_exclusao_tipo_refeicao.json');
  if (
    x.excluirTodosQAAUTO !== false ||
    typeof x.nome !== 'string' ||
    !/^QAAUTO\b/i.test(x.nome.trim())
  )
    throw new Error('Informe nome QAAUTO exato e excluirTodosQAAUTO=false.');
  return x.nome.trim();
}
