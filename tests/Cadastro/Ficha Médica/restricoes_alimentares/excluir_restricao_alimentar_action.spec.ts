import { expect, test } from '@playwright/test';
import { excluirRestricaoAlimentar, excluirRestricoesAlimentaresEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoRestricaoAlimentar } from './restricao_alimentar_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Restrição Alimentar', () => {
  test('exclui pela lixeira somente a restrição alimentar QAAUTO identificada no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoRestricaoAlimentar();
    await loginSge(page, { baseUrl: BASE_URL });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirRestricoesAlimentaresEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidas).toBe(resultado.descricoesExcluidas.length);
      expect(resultado.descricoesExcluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Restrições alimentares QAAUTO excluídas pela interface: ${resultado.totalExcluidas}`);
      return;
    }

    test.skip(!configuracao.descricao, 'Informe no JSON o nome exato de uma restrição alimentar QAAUTO para exclusão individual.');
    const excluida = await excluirRestricaoAlimentar(page, configuracao.descricao);
    expect(excluida.descricao).toBe(configuracao.descricao);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
