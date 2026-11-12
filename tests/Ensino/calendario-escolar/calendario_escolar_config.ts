import fs from 'node:fs';
import path from 'node:path';
import type { CalendarioEscolarOpcoes } from '../../../src/factories/calendario-escolar.factory';
function ler(nome: string): Record<string, unknown> {
  const x: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!x || typeof x !== 'object' || Array.isArray(x))
    throw new Error(`${nome} deve conter um objeto.`);
  return x as Record<string, unknown>;
}
export function configCalendarioEscolar(): { quantidade: number; dados: CalendarioEscolarOpcoes } {
  const x = ler('dados_calendario_escolar.json');
  const q = x.quantidade == null || x.quantidade === '' ? 1 : Number(x.quantidade);
  if (
    !Number.isSafeInteger(q) ||
    q < 1 ||
    typeof x.descricao !== 'string' ||
    typeof x.anoLetivo !== 'string' ||
    !x.datas ||
    typeof x.datas !== 'object' ||
    Array.isArray(x.datas)
  )
    throw new Error('Configuração de calendário inválida.');
  for (const v of Object.values(x.datas))
    if (typeof v !== 'string') throw new Error('Datas devem ser textos.');
  return {
    quantidade: q,
    dados: {
      descricao: x.descricao,
      anoLetivo: x.anoLetivo,
      datas: x.datas as Record<string, string>,
    },
  };
}
export function configExclusaoCalendarioEscolar(): {
  excluirTodosQAAUTO: boolean;
  descricao: string;
} {
  const x = ler('dados_exclusao_calendario_escolar.json');
  if (typeof x.excluirTodosQAAUTO !== 'boolean')
    throw new Error('Informe excluirTodosQAAUTO como true ou false.');
  if (typeof x.descricao !== 'string') throw new Error('A descrição deve ser texto.');
  const descricao = x.descricao.trim();
  if (!x.excluirTodosQAAUTO && !/^QAAUTO\b/i.test(descricao)) {
    throw new Error('Informe a descrição QAAUTO exata para exclusão individual.');
  }
  return { excluirTodosQAAUTO: x.excluirTodosQAAUTO, descricao };
}
