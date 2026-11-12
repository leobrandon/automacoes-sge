import { test } from '@playwright/test';
import { criarGrupoAnosEscolares, excluirGrupoAnosEscolares } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { configGrupoAnos } from './grupo_anos_escolares_config';
test('cria e exclui grupo desta execução', async ({ page }) => {
  const c = configGrupoAnos();
  test.setTimeout(Math.max(180000, c.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  const criados: string[] = [];
  try {
    for (let i = 1; i <= c.quantidade; i++)
      criados.push(await criarGrupoAnosEscolares(page, c.dados, i));
  } finally {
    const falhas: Error[] = [];
    for (const nome of criados.reverse()) {
      try {
        await excluirGrupoAnosEscolares(page, nome);
      } catch (e) {
        falhas.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (falhas.length) throw new AggregateError(falhas, 'Falha ao limpar grupos desta execução.');
  }
});
