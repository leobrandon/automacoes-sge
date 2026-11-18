import {test} from '@playwright/test';
import {criarOrcamento} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configCriacaoOrcamento} from './orcamento_config';

// Criação isolada: preserva os orçamentos criados.
test('cria e mantém orçamento', async ({page}) => {
  const {quantidade, dados} = configCriacaoOrcamento();
  test.setTimeout(Math.max(180000, quantidade * 150000));
  await loginSge(page, {baseUrl: process.env.BASE_URL, timeout: 60000});
  for (let s = 1; s <= quantidade; s++) await criarOrcamento(page, dados, s);
});
