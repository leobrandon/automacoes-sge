import { test } from '@playwright/test';
import { criarFormulaAprovacao } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configFormulaAprovacao } from './formula_aprovacao_config';

test('cadastra fórmulas de aprovação e mantém os registros', async ({ page }) => {
  const config = configFormulaAprovacao();
  test.setTimeout(Math.max(120000, config.quantidade * 90000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  for (let i = 1; i <= config.quantidade; i++) await criarFormulaAprovacao(page, config.dados, i);
});
