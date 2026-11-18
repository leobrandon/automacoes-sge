import { expect, test } from '@playwright/test';
import { excluirTipoPauta, excluirTiposPautaEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoExclusaoTipoPauta } from './tipo_pauta_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige o nome exato no JSON; com "excluirTodasQAAUTO": true
// remove todos os Tipos de pauta cujo nome começa com QAAUTO. Os que têm acompanhamento (mesmo concluído) o SGE
// não deixa excluir: ficam no ambiente e são apenas listados.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Tipo de pauta', () => {
  test('exclui somente o Tipo de pauta QAAUTO identificado no JSON (ou todos, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoTipoPauta();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 900000 : 120000);
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirTiposPautaEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidos).toBe(resultado.excluidos.length);
      expect(resultado.excluidos.every((nome) => /^QAAUTO\b/i.test(nome))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Tipos de pauta QAAUTO excluídos pela interface: ${resultado.totalExcluidos}`);
      for (const mantido of resultado.mantidosPorVinculo) {
        console.log(`ℹ️ Mantido por vínculo: ${mantido.nome} (${mantido.motivo})`);
      }
      return;
    }

    const excluido = await excluirTipoPauta(page, configuracao.nome);
    expect(excluido.nome).toBe(configuracao.nome);
    expect(new URL(excluido.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
