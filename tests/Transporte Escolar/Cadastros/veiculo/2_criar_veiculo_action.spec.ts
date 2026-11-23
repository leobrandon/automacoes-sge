import { expect, test } from '@playwright/test';
import { criarVeiculo } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaVeiculo } from '../../../../src/helpers/navigation/veiculo.navigation';
import { lerConfiguracaoCriacaoVeiculo } from './veiculo_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Transporte Escolar > Cadastros > Veículo', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoVeiculo();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criado = await criarVeiculo(page, configuracao.dados, sequencia);
      expect(criado.modelo).toMatch(/^QAAUTO\b/i);
      expect(new URL(criado.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaVeiculo(page, criado.modelo)).toHaveCount(1);
      console.log(`✅ Veículo ${sequencia}/${configuracao.quantidade} mantido: ${criado.modelo}`);
    }
  });
});
