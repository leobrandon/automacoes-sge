import { test } from '@playwright/test';
import { criarTipoRefeicao, excluirTipoRefeicao } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { configTipoRefeicao } from './tipo_refeicao_config';
test('cria e exclui tipos de refeição desta execução', async ({ page }) => {
  const c = configTipoRefeicao();
  test.setTimeout(Math.max(180000, c.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  const criados: string[] = [];
  try {
    for (let i = 1; i <= c.quantidade; i++) criados.push(await criarTipoRefeicao(page, c.nome, i));
  } finally {
    const falhas: Error[] = [];
    for (const nome of criados.reverse()) {
      try {
        await excluirTipoRefeicao(page, nome);
      } catch (e) {
        falhas.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (falhas.length) throw new AggregateError(falhas, 'Falha ao limpar tipos desta execução.');
  }
});
