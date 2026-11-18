import {test} from '@playwright/test';
import {excluirModulacaoAdministrativa} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configExclusaoModulacaoAdministrativa} from './modulacao_administrativa_config';

test('exclui modulação administrativa do servidor QAAUTO', async ({page}) => {
  const alvo = configExclusaoModulacaoAdministrativa();
  test.setTimeout(180000);
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  await excluirModulacaoAdministrativa(page, alvo);
});
