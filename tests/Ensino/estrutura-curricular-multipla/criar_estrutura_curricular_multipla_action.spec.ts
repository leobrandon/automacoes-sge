import { test } from '@playwright/test';
import { criarEstruturaCurricularMultipla } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configEstruturaCurricular } from './estrutura_curricular_multipla_config';

test('cria estruturas curriculares com anos e grades', async ({ page }) => {
  const config = configEstruturaCurricular();
  test.setTimeout(Math.max(180000, config.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  for (let i = 1; i <= config.quantidade; i++)
    await criarEstruturaCurricularMultipla(page, config.dados, i);
});
