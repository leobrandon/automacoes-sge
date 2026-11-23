import {test} from '@playwright/test';
import {criarAnoLetivo} from '../../../src/actions';
import {loginSge} from '../../../src/helpers';
import {configAnoLetivo} from './ano_letivo_config';

test('cria e mantém ano letivo', async ({page}) => {
  const dados = configAnoLetivo();
  test.setTimeout(180000);
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  await criarAnoLetivo(page, dados);
});
