import {test} from '@playwright/test';
import {criarCusto, excluirCusto} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configCriacaoCusto} from './custo_config';

test('cria e exclui lançamentos de custo desta execução', async ({page}) => {
  const {quantidade, dados} = configCriacaoCusto();
  test.setTimeout(Math.max(240000, quantidade * 240000));
  await loginSge(page, {baseUrl: process.env.BASE_URL, timeout: 60000});
  const criados: string[] = [];
  try {
    for (let s = 1; s <= quantidade; s++) await criarCusto(page, dados, s, c => criados.push(c.descricao));
  } finally {
    const falhas: Error[] = [];
    for (const descricao of criados.reverse()) {
      try {
        await excluirCusto(page, descricao);
      } catch (e) {
        falhas.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (falhas.length) throw new AggregateError(falhas, 'Falha ao excluir lançamentos de custo desta execução.');
  }
});
