import { expect, test } from '@playwright/test';
import { criarPatrimonio } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaPatrimonio } from '../../../src/helpers/navigation/patrimonio.navigation';
import { lerConfiguracaoCriacaoPatrimonio, opcoesLoginPatrimonio } from './patrimonio_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Patrimônio > Patrimônio', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoPatrimonio();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, opcoesLoginPatrimonio());

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criado = await criarPatrimonio(page, configuracao.dados, sequencia);
      expect(criado.placa).toMatch(/^QAAUTO\b/i);
      expect(new URL(criado.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaPatrimonio(page, criado.placa)).toHaveCount(1);
      console.log(`✅ Patrimônio ${sequencia}/${configuracao.quantidade} mantido: ${criado.placa}`);
    }
  });
});
