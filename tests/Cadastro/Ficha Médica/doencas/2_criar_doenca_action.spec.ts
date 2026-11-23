import { expect, test } from '@playwright/test';
import { criarDoenca } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaDoenca } from '../../../../src/helpers/navigation/doenca.navigation';
import { lerConfiguracaoCriacaoDoenca } from './doenca_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ficha Médica > Doenças', () => {
  test('cria e mantém a quantidade configurada para conferência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoDoenca();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 60000));
    await loginSge(page, { baseUrl: BASE_URL });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const doenca = await criarDoenca(page, configuracao.dados, sequencia);
      expect(doenca.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(doenca.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaDoenca(page, doenca.descricao)).toHaveCount(1);
      console.log(`✅ Doença ${sequencia}/${configuracao.quantidade} mantida: ${doenca.descricao}`);
    }
  });
});
