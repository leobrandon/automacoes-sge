import {test} from '@playwright/test';
import {criarReceita, excluirReceita} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configCriacaoReceita} from './receita_config';

test('cria e exclui lançamentos de receita desta execução', async ({page}) => {
  const {quantidade, dados} = configCriacaoReceita();
  test.setTimeout(Math.max(240000, quantidade * 240000));
  await loginSge(page, {baseUrl: process.env.BASE_URL, timeout: 60000});
  const criados: string[] = [];
  try {
    for (let s = 1; s <= quantidade; s++) await criarReceita(page, dados, s, c => criados.push(c.descricao));
  } finally {
    const falhas: Error[] = [];
    for (const descricao of criados.reverse()) {
      try {
        await excluirReceita(page, descricao);
      } catch (e) {
        falhas.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (falhas.length) throw new AggregateError(falhas, 'Falha ao excluir lançamentos de receita desta execução.');
  }
});
