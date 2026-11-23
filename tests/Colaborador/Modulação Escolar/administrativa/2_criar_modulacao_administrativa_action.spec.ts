import {test} from '@playwright/test';
import {criarModulacaoAdministrativa} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configModulacaoAdministrativa} from './modulacao_administrativa_config';

test('cria e mantém modulação administrativa', async ({page}) => {
  const dados = configModulacaoAdministrativa();
  test.setTimeout(180000);
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  await criarModulacaoAdministrativa(page, dados);
});
