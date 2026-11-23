import { expect, test } from '@playwright/test';
import { criarTipoPauta } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaTipoPauta } from '../../../src/helpers/navigation/tipo-pauta.navigation';
import { lerConfiguracaoCriacaoTipoPauta } from './tipo_pauta_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Acompanhamento/Pautas > Tipos de pauta', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoTipoPauta();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criado = await criarTipoPauta(page, configuracao.dados, sequencia);
      expect(criado.nome).toMatch(/^QAAUTO\b/i);
      expect(new URL(criado.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaTipoPauta(page, criado.nome)).toHaveCount(1);
      console.log(`✅ Tipo de pauta ${sequencia}/${configuracao.quantidade} mantido: ${criado.nome}`);
    }
  });
});
