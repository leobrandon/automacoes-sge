import fs from 'node:fs';
import path from 'node:path';
import {
  validarProjetoPedagogico,
  type ProjetoPedagogicoDados,
} from '../../../src/factories/projeto-acao-pedagogica.factory';
function ler(nome: string): Record<string, unknown> {
  const x: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!x || typeof x !== 'object' || Array.isArray(x))
    throw new Error(`${nome} deve conter objeto.`);
  return x as Record<string, unknown>;
}
export function configProjeto(): ProjetoPedagogicoDados {
  const x = ler('dados_projeto_acao_pedagogica.json');
  for (const k of ['escola', 'tenant', 'anoLetivo', 'periodo'])
    if (typeof x[k] !== 'string') throw new Error(`${k} deve ser texto.`);
  return validarProjetoPedagogico(x as unknown as ProjetoPedagogicoDados);
}
export function idProjetoParaExcluir(): string {
  const x = ler('dados_exclusao_projeto_acao_pedagogica.json');
  if (typeof x.id !== 'string' || !/^\d+$/.test(x.id) || x.id === '0')
    throw new Error('Informe o ID do projeto criado na execução anterior.');
  return x.id;
}
/** Credenciais opcionais da unidade escolar (SGE_USUARIO_UNIDADE / SGE_SENHA_UNIDADE no .env). Sem elas, usa SGE_USUARIO/SGE_SENHA. */
export function opcoesLoginProjeto(): { baseUrl?: string; usuario?: string; senha?: string } {
  const usuario = process.env.SGE_USUARIO_UNIDADE,
    senha = process.env.SGE_SENHA_UNIDADE;
  if (!!usuario !== !!senha)
    throw new Error('Defina SGE_USUARIO_UNIDADE e SGE_SENHA_UNIDADE juntas no .env.');
  return { baseUrl: process.env.BASE_URL, usuario, senha };
}
