import {test} from '@playwright/test';
import {criarCusto} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configCriacaoCusto} from './custo_config';

// Criação isolada: preserva os lançamentos criados.
test('cria e mantém lançamento de custo', async ({page}) => {
  const {quantidade, dados} = configCriacaoCusto();
  test.setTimeout(Math.max(180000, quantidade * 150000));
  await loginSge(page, {baseUrl: process.env.BASE_URL, timeout: 60000});
  for (let s = 1; s <= quantidade; s++) await criarCusto(page, dados, s);
});
