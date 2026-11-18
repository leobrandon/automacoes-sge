import { expect, test } from '@playwright/test';
import { criarItem } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaItem } from '../../../src/helpers/navigation/item.navigation';
import { lerConfiguracaoCriacaoItem } from './item_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Item', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoItem();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criado = await criarItem(page, configuracao.dados, sequencia);
      expect(criado.descricao).toMatch(/^QAAUTO\b/i);
      expect(criado.descricao).toMatch(new RegExp(` ${criado.sequencia}$`));
      expect(new URL(criado.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaItem(page, criado.descricao)).toHaveCount(1);
      console.log(`✅ Item ${sequencia}/${configuracao.quantidade} mantido: ${criado.descricao}`);
    }
  });
});
