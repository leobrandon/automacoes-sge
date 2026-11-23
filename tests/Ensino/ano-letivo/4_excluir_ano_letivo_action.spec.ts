import {test} from '@playwright/test';
import {excluirAnoLetivo} from '../../../src/actions';
import {loginSge} from '../../../src/helpers';
import {configExclusaoAnoLetivo} from './ano_letivo_config';

test('exclui o ano letivo informado (posterior ao corrente)', async ({page}) => {
  const ano = configExclusaoAnoLetivo();
  test.setTimeout(180000);
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  await excluirAnoLetivo(page, ano);
});
