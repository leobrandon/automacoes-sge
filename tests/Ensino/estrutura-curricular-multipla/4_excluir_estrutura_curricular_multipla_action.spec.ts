import { expect, test } from '@playwright/test';
import { excluirEstruturaCurricularMultipla } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configExclusaoEstruturaCurricular } from './estrutura_curricular_multipla_config';

test('exclui a estrutura curricular QAAUTO informada', async ({ page }) => {
  const descricao = configExclusaoEstruturaCurricular();
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  expect(await excluirEstruturaCurricularMultipla(page, descricao)).toBe(descricao);
});
