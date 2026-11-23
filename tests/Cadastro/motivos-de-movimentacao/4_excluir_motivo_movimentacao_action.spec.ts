import { expect, test } from '@playwright/test';
import { excluirMotivoMovimentacao, excluirMotivosMovimentacaoEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoExclusaoMotivoMovimentacao } from './motivo_movimentacao_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Motivos de Movimentação', () => {
  test('exclui somente o Motivo QAAUTO identificado no JSON (ou todos, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoMotivoMovimentacao();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    // O login no ambiente é lento; o padrão de 20 s do helper não basta (mesmo ajuste de Períodos).
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirMotivosMovimentacaoEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidos).toBe(resultado.descricoesExcluidas.length);
      expect(resultado.descricoesExcluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Motivos QAAUTO excluídos pela interface: ${resultado.totalExcluidos}`);
      return;
    }

    const excluido = await excluirMotivoMovimentacao(page, configuracao.descricao);
    expect(excluido.descricao).toBe(configuracao.descricao);
    expect(new URL(excluido.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
