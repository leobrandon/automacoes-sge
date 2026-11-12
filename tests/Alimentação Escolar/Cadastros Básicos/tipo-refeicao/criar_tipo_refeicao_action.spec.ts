import { test } from '@playwright/test';
import { criarTipoRefeicao } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { configTipoRefeicao } from './tipo_refeicao_config';
test('cria e mantém tipos de refeição configurados', async ({ page }) => {
  const c = configTipoRefeicao();
  test.setTimeout(Math.max(180000, c.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  for (let i = 1; i <= c.quantidade; i++) await criarTipoRefeicao(page, c.nome, i);
});
