import { expect, test } from '@playwright/test';
import { excluirMetricaAcompanhamento, excluirMetricasAcompanhamentoEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoExclusaoMetricaAcompanhamento } from './metrica_acompanhamento_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige classificação QAAUTO e faixa exatas no JSON; com
// "excluirTodasQAAUTO": true remove todas as Métricas cuja classificação começa com QAAUTO (e só elas).
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Métrica', () => {
  test('exclui somente a Métrica QAAUTO identificada no JSON (ou todas, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoMetricaAcompanhamento();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirMetricasAcompanhamentoEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidas).toBe(resultado.excluidas.length);
      expect(resultado.excluidas.every((metrica) => /^QAAUTO\b/i.test(metrica))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Métricas QAAUTO excluídas pela interface: ${resultado.totalExcluidas}`);
      return;
    }

    const excluida = await excluirMetricaAcompanhamento(page, configuracao);
    expect(excluida.classificacao).toBe(configuracao.classificacao);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
