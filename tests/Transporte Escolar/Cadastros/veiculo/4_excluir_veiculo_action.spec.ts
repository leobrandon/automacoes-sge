import { expect, test } from '@playwright/test';
import { excluirVeiculo, excluirVeiculosEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoVeiculo } from './veiculo_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Veículos', () => {
  test('exclui somente o Veículo QAAUTO identificado no JSON (ou todos, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoVeiculo();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirVeiculosEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidos).toBe(resultado.modelosExcluidos.length);
      expect(resultado.modelosExcluidos.every((modelo) => /^QAAUTO\b/i.test(modelo))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Veículos QAAUTO excluídos pela interface: ${resultado.totalExcluidos}`);
      return;
    }

    const excluido = await excluirVeiculo(page, configuracao.modelo);
    expect(excluido.modelo).toBe(configuracao.modelo);
    expect(new URL(excluido.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
