import { expect, test } from '@playwright/test';
import { criarConfiguracaoAnoEscolar, excluirConfiguracaoAnoEscolar } from '../../../src/actions';
import type { ConfiguracaoAnoEscolarAlvo } from '../../../src/factories/configurar-ano-escolar.factory';
import { loginSge } from '../../../src/helpers';
import { configConfiguracaoAnoEscolar } from './configurar_ano_escolar_config';

test('configura o ano escolar e exclui a configuração desta execução', async ({ page }) => {
  const dados = configConfiguracaoAnoEscolar();
  test.setTimeout(180000);
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  const criadas: ConfiguracaoAnoEscolarAlvo[] = [];
  try {
    await criarConfiguracaoAnoEscolar(page, dados, (alvo) => criadas.push(alvo));
  } finally {
    const falhas: Error[] = [];
    for (const alvo of criadas.reverse()) {
      try {
        expect(await excluirConfiguracaoAnoEscolar(page, alvo)).toEqual(alvo);
      } catch (erro) {
        falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
      }
    }
    if (falhas.length)
      throw new AggregateError(falhas, 'Falha ao excluir configuração desta execução.');
  }
});
