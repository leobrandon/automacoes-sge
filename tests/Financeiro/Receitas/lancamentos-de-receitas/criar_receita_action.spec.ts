import {test} from '@playwright/test';
import {criarReceita} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configCriacaoReceita} from './receita_config';

// Criação isolada: preserva os lançamentos criados.
test('cria e mantém lançamento de receita', async ({page}) => {
  const {quantidade, dados} = configCriacaoReceita();
  test.setTimeout(Math.max(180000, quantidade * 150000));
  await loginSge(page, {baseUrl: process.env.BASE_URL, timeout: 60000});
  for (let s = 1; s <= quantidade; s++) await criarReceita(page, dados, s);
});
