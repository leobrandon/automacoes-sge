import { expect, test } from '@playwright/test';
import { criarFormulaAprovacao, excluirFormulaAprovacao } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configFormulaAprovacao } from './formula_aprovacao_config';

test('cadastra fórmulas de aprovação e exclui os registros desta execução', async ({ page }) => {
  const config = configFormulaAprovacao();
  test.setTimeout(Math.max(180000, config.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  const criadas: string[] = [];
  try {
    for (let i = 1; i <= config.quantidade; i++)
      await criarFormulaAprovacao(page, config.dados, i, (descricao) => criadas.push(descricao));
  } finally {
    const falhas: Error[] = [];
    for (const descricao of criadas.reverse()) {
      try {
        expect(await excluirFormulaAprovacao(page, descricao)).toBe(descricao);
      } catch (erro) {
        falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
      }
    }
    if (falhas.length) throw new AggregateError(falhas, 'Falha ao excluir fórmulas desta execução.');
  }
});
