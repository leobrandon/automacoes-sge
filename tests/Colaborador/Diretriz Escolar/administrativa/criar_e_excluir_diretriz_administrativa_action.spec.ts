import {test} from '@playwright/test';
import {criarDiretrizAdministrativa, excluirDiretrizAdministrativa} from '../../../../src/actions';
import type {AlvoDiretrizAdministrativa} from '../../../../src/factories/diretriz-administrativa.factory';
import {loginSge} from '../../../../src/helpers';
import {configDiretrizAdministrativa} from './diretriz_administrativa_config';

test('cria e exclui diretriz administrativa desta execução', async ({page}) => {
  const dados = configDiretrizAdministrativa();
  test.setTimeout(180000);
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  const criados: AlvoDiretrizAdministrativa[] = [];
  try {
    await criarDiretrizAdministrativa(page, dados, alvo => criados.push(alvo));
  } finally {
    const falhas: Error[] = [];
    for (const alvo of criados.reverse()) {
      try {
        await excluirDiretrizAdministrativa(page, alvo);
      } catch (e) {
        falhas.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (falhas.length) throw new AggregateError(falhas, 'Falha ao excluir a diretriz administrativa desta execução.');
  }
});
