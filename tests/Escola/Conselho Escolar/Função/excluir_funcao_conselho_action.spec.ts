import { expect, test } from '@playwright/test';
import { excluirFuncaoConselho, excluirFuncoesConselhoEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoFuncaoConselho } from './funcao_conselho_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
// A "Função teste" cadastrada manualmente não é QAAUTO e nunca é tocada.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Função do Conselho Escolar', () => {
  test('exclui pela lixeira somente a função QAAUTO identificada no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoFuncaoConselho();
    await loginSge(page, { baseUrl: BASE_URL });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirFuncoesConselhoEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidas).toBe(resultado.descricoesExcluidas.length);
      expect(resultado.descricoesExcluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Funções QAAUTO excluídas pela interface: ${resultado.totalExcluidas}`);
      return;
    }

    const excluida = await excluirFuncaoConselho(page, configuracao.descricao);
    expect(excluida.descricao).toBe(configuracao.descricao);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
    console.log(`🧹 Função removida: ${excluida.descricao}`);
  });
});
