import {test} from '@playwright/test';
import {criarAnoLetivo, excluirAnoLetivo} from '../../../src/actions';
import {loginSge} from '../../../src/helpers';
import {configAnoLetivo} from './ano_letivo_config';

test('cria e exclui o ano letivo desta execução', async ({page}) => {
  const dados = configAnoLetivo();
  test.setTimeout(180000);
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  const criados: string[] = [];
  try {
    await criarAnoLetivo(page, dados, ano => criados.push(ano));
  } finally {
    const falhas: Error[] = [];
    for (const ano of criados.reverse()) {
      try {
        await excluirAnoLetivo(page, ano);
      } catch (e) {
        falhas.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (falhas.length) throw new AggregateError(falhas, 'Falha ao excluir o ano letivo desta execução.');
  }
});
