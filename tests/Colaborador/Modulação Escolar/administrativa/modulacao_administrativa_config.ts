import fs from 'node:fs';
import path from 'node:path';
import type {AlvoModulacaoAdministrativa, ModulacaoAdministrativaDados} from '../../../../src/factories/modulacao-administrativa.factory';

function ler(nome: string): Record<string, unknown> {
  const x: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!x || typeof x !== 'object' || Array.isArray(x)) throw new Error(`${nome} deve ser objeto.`);
  return x as Record<string, unknown>;
}

function textos<T>(x: Record<string, unknown>, campos: string[]): T {
  for (const k of campos) if (typeof x[k] !== 'string') throw new Error(`${k} deve ser texto.`);
  return x as unknown as T;
}

// Uma modulação por servidor/diretriz: o SGE recusa repetir a mesma diretriz para o contrato, então não há `quantidade`.
export function configModulacaoAdministrativa(): ModulacaoAdministrativaDados {
  return textos<ModulacaoAdministrativaDados>(ler('dados_modulacao_administrativa.json'),
    ['unidade', 'turno', 'funcao', 'cargo', 'colaborador', 'contrato', 'departamento', 'dataInicio', 'observacao']);
}

export function configExclusaoModulacaoAdministrativa(): AlvoModulacaoAdministrativa {
  const x = ler('dados_exclusao_modulacao_administrativa.json');
  if (x.excluirTodosQAAUTO !== false) throw new Error('Exclusão geral não é suportada: use excluirTodosQAAUTO=false.');
  return textos<AlvoModulacaoAdministrativa>(x, ['unidade', 'turno', 'funcao', 'cargo', 'colaborador', 'contrato', 'departamento']);
}
