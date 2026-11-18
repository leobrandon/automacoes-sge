import {test} from '@playwright/test';
import {criarModulacaoAdministrativa, excluirModulacaoAdministrativa} from '../../../../src/actions';
import type {AlvoModulacaoAdministrativa} from '../../../../src/factories/modulacao-administrativa.factory';
import {loginSge} from '../../../../src/helpers';
import {configModulacaoAdministrativa} from './modulacao_administrativa_config';

test('cria e exclui modulação administrativa desta execução', async ({page}) => {
  const dados = configModulacaoAdministrativa();
  test.setTimeout(180000);
  await loginSge(page, {baseUrl: process.env.BASE_URL});
  const criados: AlvoModulacaoAdministrativa[] = [];
  try {
    await criarModulacaoAdministrativa(page, dados, alvo => criados.push(alvo));
  } finally {
    const falhas: Error[] = [];
    for (const alvo of criados.reverse()) {
      try {
        await excluirModulacaoAdministrativa(page, alvo);
      } catch (e) {
        falhas.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (falhas.length) throw new AggregateError(falhas, 'Falha ao excluir a modulação administrativa desta execução.');
  }
});
