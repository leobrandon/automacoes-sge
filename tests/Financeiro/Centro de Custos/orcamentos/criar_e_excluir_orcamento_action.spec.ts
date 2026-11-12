import {test} from '@playwright/test';
import {criarOrcamento, excluirOrcamento} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configCriacaoOrcamento} from './orcamento_config';

test('cria e exclui orçamentos desta execução', async ({page}) => {
  const {quantidade, dados} = configCriacaoOrcamento();
  test.setTimeout(Math.max(240000, quantidade * 240000));
  await loginSge(page, {baseUrl: process.env.BASE_URL, timeout: 60000});
  const criados: string[] = [];
  try {
    for (let s = 1; s <= quantidade; s++) await criarOrcamento(page, dados, s, o => criados.push(o.descricao));
  } finally {
    const falhas: Error[] = [];
    for (const descricao of criados.reverse()) {
      try {
        await excluirOrcamento(page, descricao);
      } catch (e) {
        falhas.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (falhas.length) throw new AggregateError(falhas, 'Falha ao excluir orçamentos desta execução.');
  }
});
