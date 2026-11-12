import { expect, test } from '@playwright/test';
import { criarPeriodo } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaPeriodo } from '../../../../src/helpers/navigation/periodo.navigation';
import { lerConfiguracaoCriacaoPeriodo } from './periodo_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ponto > Períodos', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoPeriodo();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criado = await criarPeriodo(page, configuracao.dados, sequencia);
      expect(criado.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(criado.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaPeriodo(page, criado.descricao)).toHaveCount(1);
      console.log(`✅ Período ${sequencia}/${configuracao.quantidade} mantido: ${criado.descricao}`);
    }
  });
});
