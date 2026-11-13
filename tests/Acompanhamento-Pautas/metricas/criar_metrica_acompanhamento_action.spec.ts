import { expect, test } from '@playwright/test';
import { criarMetricaAcompanhamento } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaMetricaAcompanhamento } from '../../../src/helpers/navigation/metrica-acompanhamento.navigation';
import { lerConfiguracaoCriacaoMetricaAcompanhamento } from './metrica_acompanhamento_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Acompanhamento/Pautas > Métricas', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoMetricaAcompanhamento();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criada = await criarMetricaAcompanhamento(page, configuracao.dados, sequencia);
      expect(criada.classificacao).toMatch(/^QAAUTO\b/i);
      expect(new URL(criada.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(
        linhaMetricaAcompanhamento(page, criada.classificacao, criada.pontuacaoMinima, criada.pontuacaoMaxima),
      ).toHaveCount(1);
      console.log(`✅ Métrica ${sequencia}/${configuracao.quantidade} mantida: ${criada.classificacao}`);
    }
  });
});
