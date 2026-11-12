import { expect, test } from '@playwright/test';
import { excluirSalaDeAula, excluirSalasDeAulaEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoExclusaoSalaDeAula } from './sala_de_aula_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Sala de Aula', () => {
  test('exclui somente a Sala de Aula QAAUTO identificada no JSON (ou todas, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoSalaDeAula();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirSalasDeAulaEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidas).toBe(resultado.excluidas.length);
      expect(resultado.excluidas.every((item) => /^QAAUTO\b/i.test(item.descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Salas de Aula QAAUTO excluídas pela interface: ${resultado.totalExcluidas}`);
      return;
    }

    const excluida = await excluirSalaDeAula(page, configuracao.descricao, configuracao.escola);
    expect(excluida.descricao).toBe(configuracao.descricao);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
