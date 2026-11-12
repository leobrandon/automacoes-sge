import {test} from '@playwright/test';
import {excluirNecessidadeNutricional} from '../../../src/actions';
import {loginSge} from '../../../src/helpers';
import {configExclusaoNecessidade} from './necessidade_nutricional_config';

test('exclui necessidade nutricional QAAUTO exata', async ({page}) => {
  const alvo = configExclusaoNecessidade();
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  await excluirNecessidadeNutricional(page, alvo);
});
