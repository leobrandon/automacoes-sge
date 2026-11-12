import { expect, test } from '@playwright/test';
import { criarCalendarioEscolar, excluirCalendarioEscolar } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configCalendarioEscolar } from './calendario_escolar_config';
test('cria, consulta e exclui calendários desta execução', async ({ page }) => {
  const c = configCalendarioEscolar();
  test.setTimeout(Math.max(180000, c.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  const criados: string[] = [];
  try {
    for (let i = 1; i <= c.quantidade; i++)
      criados.push(await criarCalendarioEscolar(page, c.dados, i));
  } finally {
    const falhas: Error[] = [];
    for (const nome of criados.reverse()) {
      try {
        expect(await excluirCalendarioEscolar(page, nome)).toBe(nome);
      } catch (e) {
        falhas.push(e instanceof Error ? e : new Error(String(e)));
      }
    }
    if (falhas.length)
      throw new AggregateError(falhas, 'Falha ao limpar calendários desta execução.');
  }
});
