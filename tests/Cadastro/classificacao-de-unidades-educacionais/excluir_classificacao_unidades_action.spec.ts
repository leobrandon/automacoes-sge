import { expect, test } from '@playwright/test';
import { excluirClassificacaoUnidades, excluirClassificacoesUnidadesEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoExclusaoClassificacaoUnidades } from './classificacao_unidades_config';

// Modo: REGRESSÃO AUTOMATIZADA. Só descrições iniciadas por QAAUTO são aceitas; as classificações
// reais do tenant nunca são alvo.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Classificações de Unidades', () => {
  test('exclui somente a Classificação QAAUTO identificada no JSON (ou todas QAAUTO, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoClassificacaoUnidades();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    // O login no ambiente é lento; o padrão de 20 s do helper não basta (mesmo ajuste de Períodos).
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirClassificacoesUnidadesEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidos).toBe(resultado.descricoesExcluidas.length);
      expect(resultado.descricoesExcluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Classificações QAAUTO excluídas pela interface: ${resultado.totalExcluidos}`);
      return;
    }

    const excluida = await excluirClassificacaoUnidades(page, configuracao.descricao);
    expect(excluida.descricao).toBe(configuracao.descricao);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
