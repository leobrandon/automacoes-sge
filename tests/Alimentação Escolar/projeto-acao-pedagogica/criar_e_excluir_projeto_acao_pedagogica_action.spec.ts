import { test } from '@playwright/test';
import { criarProjetoPedagogico, excluirProjetoPedagogico } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { selecionarUnidadeProjeto } from '../../../src/helpers/navigation/projeto-acao-pedagogica.navigation';
import { configProjeto, opcoesLoginProjeto } from './projeto_acao_pedagogica_config';
test('cria e exclui o projeto desta execução', async ({ page }) => {
  test.setTimeout(180000);
  const d = configProjeto();
  await loginSge(page, opcoesLoginProjeto());
  await selecionarUnidadeProjeto(page, d);
  const criados: string[] = [];
  try {
    criados.push(await criarProjetoPedagogico(page, d));
  } finally {
    const falhas: Error[] = [];
    for (const id of criados.reverse()) {
      try {
        await excluirProjetoPedagogico(page, d, id);
      } catch (e) {
        falhas.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (falhas.length) throw new AggregateError(falhas, 'Falha ao excluir projeto desta execução.');
  }
});
