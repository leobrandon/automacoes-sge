import fs from 'node:fs';
import path from 'node:path';
import type {AlvoDiretrizAdministrativa, DiretrizAdministrativaDados} from '../../../../src/factories/diretriz-administrativa.factory';

function ler(nome: string): Record<string, unknown> {
  const x: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error(`${nome} deve ser objeto.`);
  return x as Record<string, unknown>;
}

function textos<T>(x: Record<string, unknown>, campos: string[]): T {
  for (const k of campos) if (typeof x[k] !== 'string') throw new Error(`${k} deve ser texto.`);
  return x as unknown as T;
}

const campos = ['unidade', 'funcao', 'cargo', 'turno', 'departamento', 'horasSemanais', 'vagas'];

// Uma diretriz por execução: o formulário não aceita QAAUTO, então não há `quantidade` nem exclusão geral.
export function configDiretrizAdministrativa(): DiretrizAdministrativaDados {
  return textos<DiretrizAdministrativaDados>(ler('dados_diretriz_administrativa.json'), campos);
}

export function configExclusaoDiretrizAdministrativa(): AlvoDiretrizAdministrativa {
  const x = ler('dados_exclusao_diretriz_administrativa.json');
  if (x.excluirTodosQAAUTO !== false) throw new Error('Exclusão geral não é suportada: use excluirTodosQAAUTO=false.');
  return textos<AlvoDiretrizAdministrativa>(x, campos);
}
