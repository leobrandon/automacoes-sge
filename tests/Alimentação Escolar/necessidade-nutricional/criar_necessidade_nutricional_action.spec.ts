import {test} from '@playwright/test';
import {criarNecessidadeNutricional} from '../../../src/actions';
import {loginSge} from '../../../src/helpers';
import {configNecessidade} from './necessidade_nutricional_config';

test('cria e mantém necessidade nutricional', async ({page}) => {
  const dados = configNecessidade();
  test.setTimeout(180000);
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  await criarNecessidadeNutricional(page, dados);
});
