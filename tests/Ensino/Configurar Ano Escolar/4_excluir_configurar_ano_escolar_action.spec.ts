import { expect, test } from '@playwright/test';
import { excluirConfiguracaoAnoEscolar } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configExclusaoConfiguracaoAnoEscolar } from './configurar_ano_escolar_config';

test('exclui a configuração de ano escolar informada no JSON', async ({ page }) => {
  const alvo = configExclusaoConfiguracaoAnoEscolar();
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  expect(await excluirConfiguracaoAnoEscolar(page, alvo)).toEqual(alvo);
});
