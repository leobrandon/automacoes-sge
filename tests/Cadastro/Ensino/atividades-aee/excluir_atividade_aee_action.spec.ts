import { expect, test } from '@playwright/test';
import { excluirAtividadeAee, excluirAtividadesAeeEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoAtividadeAee } from './atividade_aee_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Atividade de AEE', () => {
  test('exclui pela lixeira somente a atividade QAAUTO identificada no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoAtividadeAee();
    await loginSge(page, { baseUrl: BASE_URL });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirAtividadesAeeEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidas).toBe(resultado.descricoesExcluidas.length);
      expect(resultado.descricoesExcluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Atividades QAAUTO excluídas pela interface: ${resultado.totalExcluidas}`);
      return;
    }

    test.skip(!configuracao.descricao, 'Informe no JSON o nome exato de uma atividade QAAUTO para exclusão individual.');
    const excluida = await excluirAtividadeAee(page, configuracao.descricao);
    expect(excluida.descricao).toBe(configuracao.descricao);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
