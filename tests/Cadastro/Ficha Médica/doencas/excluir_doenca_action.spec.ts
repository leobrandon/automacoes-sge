import { expect, test } from '@playwright/test';
import { excluirDoenca, excluirDoencasEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoDoenca } from './doenca_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Doença', () => {
  test('exclui pela lixeira somente a doença QAAUTO identificada no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoDoenca();
    await loginSge(page, { baseUrl: BASE_URL });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirDoencasEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidas).toBe(resultado.descricoesExcluidas.length);
      expect(resultado.descricoesExcluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Doenças QAAUTO excluídas pela interface: ${resultado.totalExcluidas}`);
      return;
    }

    test.skip(!configuracao.descricao, 'Informe no JSON o nome exato de uma doença QAAUTO para exclusão individual.');
    const excluida = await excluirDoenca(page, configuracao.descricao);
    expect(excluida.descricao).toBe(configuracao.descricao);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
