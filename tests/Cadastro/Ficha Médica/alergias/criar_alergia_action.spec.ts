import { expect, test } from '@playwright/test';
import { criarAlergia } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaAlergia } from '../../../../src/helpers/navigation/alergia.navigation';
import { lerConfiguracaoCriacaoAlergia } from './alergia_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ficha Médica > Alergias', () => {
  test('cria e mantém a quantidade configurada para conferência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAlergia();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 60000));
    await loginSge(page, { baseUrl: BASE_URL });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const alergia = await criarAlergia(page, configuracao.dados, sequencia);
      expect(alergia.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(alergia.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaAlergia(page, alergia.descricao)).toHaveCount(1);
      console.log(`✅ Alergia ${sequencia}/${configuracao.quantidade} mantida: ${alergia.descricao}`);
    }
  });
});
