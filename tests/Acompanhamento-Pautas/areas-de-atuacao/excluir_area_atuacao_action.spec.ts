import { expect, test } from '@playwright/test';
import { excluirAreaAtuacao, excluirAreasAtuacaoEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoExclusaoAreaAtuacao } from './area_atuacao_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige a descrição exata no JSON; com "excluirTodasQAAUTO": true
// remove todas as Áreas cuja descrição começa com QAAUTO. As que o SGE recusa por vínculo (usadas por Tipo de pauta)
// ficam no ambiente e são apenas listadas.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Área de atuação', () => {
  test('exclui somente a Área de atuação QAAUTO identificada no JSON (ou todas, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoAreaAtuacao();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirAreasAtuacaoEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidas).toBe(resultado.excluidas.length);
      expect(resultado.excluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Áreas QAAUTO excluídas pela interface: ${resultado.totalExcluidas}`);
      for (const mantida of resultado.mantidasPorVinculo) {
        console.log(`ℹ️ Mantida por vínculo: ${mantida.descricao} (${mantida.motivo})`);
      }
      return;
    }

    const excluida = await excluirAreaAtuacao(page, configuracao.descricao);
    expect(excluida.descricao).toBe(configuracao.descricao);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
