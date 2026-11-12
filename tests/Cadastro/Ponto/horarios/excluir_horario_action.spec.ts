import { expect, test } from '@playwright/test';
import { excluirHorario, excluirHorariosEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoHorario } from './horario_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Horários', () => {
  test('exclui somente o Horário QAAUTO identificado no JSON (ou todos, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoHorario();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirHorariosEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidos).toBe(resultado.descricoesExcluidas.length);
      expect(resultado.descricoesExcluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Horários QAAUTO excluídos pela interface: ${resultado.totalExcluidos}`);
      return;
    }

    const excluido = await excluirHorario(page, configuracao.descricao);
    expect(excluido.descricao).toBe(configuracao.descricao);
    expect(new URL(excluido.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
