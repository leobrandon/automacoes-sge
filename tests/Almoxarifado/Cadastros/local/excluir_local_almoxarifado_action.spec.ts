import { expect, test } from '@playwright/test';
import { excluirLocalAlmoxarifado, excluirLocaisAlmoxarifadoEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoLocalAlmoxarifado } from './local_almoxarifado_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Local (Almoxarifado)', () => {
  test('exclui somente o Local QAAUTO identificado no JSON (ou todos, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoLocalAlmoxarifado();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirLocaisAlmoxarifadoEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidos).toBe(resultado.nomesExcluidos.length);
      expect(resultado.nomesExcluidos.every((nome) => /^QAAUTO\b/i.test(nome))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Locais QAAUTO excluídos pela interface: ${resultado.totalExcluidos}`);
      return;
    }

    const excluido = await excluirLocalAlmoxarifado(page, configuracao.nome);
    expect(excluido.nome).toBe(configuracao.nome);
    expect(new URL(excluido.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
