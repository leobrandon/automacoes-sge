import {test} from '@playwright/test';
import {excluirDiretrizAdministrativa} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configExclusaoDiretrizAdministrativa} from './diretriz_administrativa_config';

test('exclui diretriz administrativa informada', async ({page}) => {
  const alvo = configExclusaoDiretrizAdministrativa();
  test.setTimeout(120000);
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  await excluirDiretrizAdministrativa(page, alvo);
});
