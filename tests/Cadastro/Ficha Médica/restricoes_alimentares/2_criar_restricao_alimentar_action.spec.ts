import { expect, test } from '@playwright/test';
import { criarRestricaoAlimentar } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaRestricaoAlimentar } from '../../../../src/helpers/navigation/restricao-alimentar.navigation';
import { lerConfiguracaoCriacaoRestricaoAlimentar } from './restricao_alimentar_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ficha Médica > Restrições Alimentares', () => {
  test('cria e mantém a quantidade configurada para conferência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoRestricaoAlimentar();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 60000));
    await loginSge(page, { baseUrl: BASE_URL });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const restricao = await criarRestricaoAlimentar(page, configuracao.dados, sequencia);
      expect(restricao.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(restricao.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaRestricaoAlimentar(page, restricao.descricao)).toHaveCount(1);
      console.log(`✅ Restrição alimentar ${sequencia}/${configuracao.quantidade} mantida: ${restricao.descricao}`);
    }
  });
});
