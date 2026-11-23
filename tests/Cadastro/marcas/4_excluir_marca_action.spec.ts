import { expect, test } from '@playwright/test';
import { excluirMarca, excluirMarcasEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoExclusaoMarca } from './marca_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Marcas', () => {
  test('exclui somente a Marca QAAUTO identificada no JSON (ou todas, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoMarca();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    // O login no ambiente é lento; o padrão de 20 s do helper não basta (mesmo ajuste de Períodos).
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirMarcasEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidos).toBe(resultado.descricoesExcluidas.length);
      expect(resultado.descricoesExcluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Marcas QAAUTO excluídas pela interface: ${resultado.totalExcluidos}`);
      return;
    }

    const excluida = await excluirMarca(page, configuracao.descricao);
    expect(excluida.descricao).toBe(configuracao.descricao);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
