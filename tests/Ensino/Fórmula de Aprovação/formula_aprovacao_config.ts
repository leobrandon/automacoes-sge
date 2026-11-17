import fs from 'node:fs';
import path from 'node:path';
import {
  buildFormulaAprovacao,
  isFormulaAprovacaoQAAuto,
  type FormulaAprovacaoDados,
} from '../../../src/factories/formula-aprovacao.factory';

function ler(nome: string): Record<string, unknown> {
  const dados: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, nome), 'utf8'));
  if (!dados || typeof dados !== 'object' || Array.isArray(dados))
    throw new Error(`${nome} deve conter um objeto.`);
  return dados as Record<string, unknown>;
}

export function configFormulaAprovacao(): { quantidade: number; dados: FormulaAprovacaoDados } {
  const bruto = ler('dados_formula_aprovacao.json');
  const quantidade = bruto.quantidade == null || bruto.quantidade === '' ? 1 : Number(bruto.quantidade);
  if (!Number.isSafeInteger(quantidade) || quantidade < 1)
    throw new Error('"quantidade" deve ser um inteiro maior que zero.');
  const dados = bruto as unknown as FormulaAprovacaoDados;
  buildFormulaAprovacao(dados); // valida tipos e regras antes de abrir o navegador
  return { quantidade, dados };
}

export function configExclusaoFormulaAprovacao(): string {
  const { descricao } = ler('dados_exclusao_formula_aprovacao.json');
  if (typeof descricao !== 'string' || !isFormulaAprovacaoQAAuto(descricao))
    throw new Error('Informe a descrição QAAUTO exata para exclusão.');
  return descricao.trim();
}
