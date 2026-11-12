import { expect, test } from '@playwright/test';
import { excluirDepreciacaoPatrimonio, excluirDepreciacoesPatrimonioEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoExclusaoDepreciacaoPatrimonio } from './depreciacao_patrimonio_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Depreciação (Patrimônio)', () => {
  test('exclui somente a Depreciação QAAUTO identificada no JSON (ou todas, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoDepreciacaoPatrimonio();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirDepreciacoesPatrimonioEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidos).toBe(resultado.descricoesExcluidas.length);
      expect(resultado.descricoesExcluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Depreciações QAAUTO excluídas pela interface: ${resultado.totalExcluidos}`);
      return;
    }

    const excluida = await excluirDepreciacaoPatrimonio(page, configuracao.descricao);
    expect(excluida.descricao).toBe(configuracao.descricao);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
