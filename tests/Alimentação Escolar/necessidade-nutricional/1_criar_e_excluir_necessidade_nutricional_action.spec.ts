import {test} from '@playwright/test';
import {criarNecessidadeNutricional, excluirNecessidadeNutricional, type NecessidadeCriada} from '../../../src/actions';
import {loginSge} from '../../../src/helpers';
import {configNecessidade} from './necessidade_nutricional_config';

test('cria e exclui necessidade nutricional desta execução', async ({page}) => {
  const dados = configNecessidade();
  test.setTimeout(180000);
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  const criados: NecessidadeCriada[] = [];
  try {
    criados.push(await criarNecessidadeNutricional(page, dados));
  } finally {
    const falhas: Error[] = [];
    for (const alvo of criados.reverse()) {
      try {
        await excluirNecessidadeNutricional(page, alvo);
      } catch (e) {
        falhas.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (falhas.length) throw new AggregateError(falhas, 'Falha ao limpar necessidades nutricionais desta execução.');
  }
});
