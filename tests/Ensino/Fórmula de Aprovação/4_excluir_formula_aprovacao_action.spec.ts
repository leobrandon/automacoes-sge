import { expect, test } from '@playwright/test';
import { excluirFormulaAprovacao } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configExclusaoFormulaAprovacao } from './formula_aprovacao_config';

test('exclui a fórmula de aprovação informada no JSON', async ({ page }) => {
  const descricao = configExclusaoFormulaAprovacao();
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  expect(await excluirFormulaAprovacao(page, descricao)).toBe(descricao);
});
