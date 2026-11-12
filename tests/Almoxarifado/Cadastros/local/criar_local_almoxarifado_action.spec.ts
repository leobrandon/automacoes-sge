import { expect, test } from '@playwright/test';
import { criarLocalAlmoxarifado } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaLocalAlmoxarifado } from '../../../../src/helpers/navigation/local-almoxarifado.navigation';
import { lerConfiguracaoCriacaoLocalAlmoxarifado } from './local_almoxarifado_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Almoxarifado > Cadastros > Local', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoLocalAlmoxarifado();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criado = await criarLocalAlmoxarifado(page, configuracao.dados, sequencia);
      expect(criado.nome).toMatch(/^QAAUTO\b/i);
      expect(new URL(criado.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaLocalAlmoxarifado(page, criado.nome)).toHaveCount(1);
      console.log(`✅ Local ${sequencia}/${configuracao.quantidade} mantido: ${criado.nome}`);
    }
  });
});
