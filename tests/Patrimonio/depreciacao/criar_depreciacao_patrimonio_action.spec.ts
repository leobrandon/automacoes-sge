import { expect, test } from '@playwright/test';
import { criarDepreciacaoPatrimonio } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaDepreciacaoPatrimonio } from '../../../src/helpers/navigation/depreciacao-patrimonio.navigation';
import { lerConfiguracaoCriacaoDepreciacaoPatrimonio } from './depreciacao_patrimonio_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Patrimônio > Depreciação', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoDepreciacaoPatrimonio();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criada = await criarDepreciacaoPatrimonio(page, configuracao.dados, sequencia);
      expect(criada.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(criada.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaDepreciacaoPatrimonio(page, criada.descricao)).toHaveCount(1);
      console.log(`✅ Depreciação ${sequencia}/${configuracao.quantidade} mantida: ${criada.descricao}`);
    }
  });
});
