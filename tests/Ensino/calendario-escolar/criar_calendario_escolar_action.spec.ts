import { test } from '@playwright/test';
import { criarCalendarioEscolar } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configCalendarioEscolar } from './calendario_escolar_config';
test('cria e mantém calendários escolares configurados', async ({ page }) => {
  const c = configCalendarioEscolar();
  test.setTimeout(Math.max(180000, c.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  for (let i = 1; i <= c.quantidade; i++) await criarCalendarioEscolar(page, c.dados, i);
});
