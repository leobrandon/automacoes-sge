import { expect, test } from '@playwright/test';
import { criarMedicamento } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaMedicamento } from '../../../../src/helpers/navigation/medicamento.navigation';
import { lerConfiguracaoCriacaoMedicamento } from './medicamento_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ficha Médica > Medicamentos', () => {
  test('cria e mantém a quantidade configurada para conferência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoMedicamento();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 60000));
    await loginSge(page, { baseUrl: BASE_URL });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const medicamento = await criarMedicamento(page, configuracao.dados, sequencia);
      expect(medicamento.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(medicamento.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaMedicamento(page, medicamento.descricao)).toHaveCount(1);
      console.log(`✅ Medicamento ${sequencia}/${configuracao.quantidade} mantido: ${medicamento.descricao}`);
    }
  });
});
