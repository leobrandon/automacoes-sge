import {test} from '@playwright/test';
import {criarDiretrizAdministrativa} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configDiretrizAdministrativa} from './diretriz_administrativa_config';

test('cria e mantém diretriz administrativa', async ({page}) => {
  const dados = configDiretrizAdministrativa();
  test.setTimeout(120000);
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  await criarDiretrizAdministrativa(page, dados);
});
