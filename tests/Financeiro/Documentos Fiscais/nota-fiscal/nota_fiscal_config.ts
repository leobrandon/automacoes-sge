import fs from 'node:fs';
import path from 'node:path';
import {buildNotaFiscal, protegerExclusaoNotaFiscal, type NotaFiscalMontada, type NotaFiscalOpcoes} from '../../../../src/factories/nota-fiscal.factory';

function ler(nome: string): Record<string, unknown> {
  const dados = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) throw new Error(`${nome}: esperado objeto JSON.`);
  return dados;
}

export function lerConfiguracaoCriacaoNotaFiscal(): {quantidade: number; opcoes: NotaFiscalOpcoes} {
  const dados = ler('dados_nota_fiscal.json');
  const quantidade = Number(dados.quantidade === '' || dados.quantidade === undefined ? 1 : dados.quantidade);
  if (!Number.isInteger(quantidade) || quantidade < 1) throw new Error('quantidade deve ser inteiro positivo (vazio = 1).');
  for (const campo of ['fornecedor', 'cnpjFornecedor', 'unidade', 'serie', 'numeroInicial', 'dataEmissao', 'valor', 'numeroContrato']) if (dados[campo] !== undefined && typeof dados[campo] !== 'string') throw new Error(`${campo} deve ser texto.`);
  const opcoes = dados as unknown as NotaFiscalOpcoes;
  buildNotaFiscal(opcoes);
  return {quantidade, opcoes};
}

export function lerConfiguracaoExclusaoNotaFiscal(): NotaFiscalMontada {
  const dados = ler('dados_exclusao_nota_fiscal.json');
  if (dados.excluirTodasQAAUTO !== false) throw new Error('Exclusão em lote não suportada: excluirTodasQAAUTO deve ser false.');
  for (const campo of ['fornecedor', 'cnpjFornecedor', 'unidade', 'numero', 'serie', 'chaveAcesso', 'dataEmissao', 'dataCadastro', 'numeroContrato', 'valor']) if (typeof dados[campo] !== 'string' || !String(dados[campo]).trim()) throw new Error(`Exclusão: informe ${campo} da nota criada nesta execução.`);
  const nota = dados as unknown as NotaFiscalMontada;
  protegerExclusaoNotaFiscal(nota);
  return nota;
}
