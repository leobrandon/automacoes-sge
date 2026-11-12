import { expect, test } from '@playwright/test';
import { excluirMedicamento, excluirMedicamentosEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoMedicamento } from './medicamento_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Medicamento', () => {
  test('exclui pela lixeira somente o medicamento QAAUTO identificado no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoMedicamento();
    await loginSge(page, { baseUrl: BASE_URL });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirMedicamentosEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidos).toBe(resultado.descricoesExcluidas.length);
      expect(resultado.descricoesExcluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Medicamentos QAAUTO excluídos pela interface: ${resultado.totalExcluidos}`);
      return;
    }

    test.skip(!configuracao.descricao, 'Informe no JSON o nome exato de um medicamento QAAUTO para exclusão individual.');
    const excluido = await excluirMedicamento(page, configuracao.descricao);
    expect(excluido.descricao).toBe(configuracao.descricao);
    expect(new URL(excluido.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
