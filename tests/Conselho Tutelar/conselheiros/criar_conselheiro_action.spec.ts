import {test} from '@playwright/test';
import {loginSge} from '../../../src/helpers';
import {criarConselheiro} from '../../../src/actions/criar-conselheiro.action';
import dados from './dados_conselheiro.json';

test('cadastra conselheiro e confirma na consulta', async ({page}) => {
  test.setTimeout(180000);
  await loginSge(page, {timeout: 60000});
  const criado = await criarConselheiro(page, dados);
  console.log('Conselheiro criado:', JSON.stringify(criado));
});
