import { expect, test } from '@playwright/test';
import { excluirGrupoAlimento, excluirGruposAlimentoEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoGrupoAlimento } from './grupo_alimento_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Grupo de Alimento', () => {
  test('exclui pela lixeira somente o Grupo de Alimento QAAUTO identificado no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoGrupoAlimento();
    await loginSge(page, { baseUrl: BASE_URL });

    if (configuracao.excluirTodosQAAUTO) {
      const resultado = await excluirGruposAlimentoEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidos).toBe(resultado.nomesExcluidos.length);
      expect(resultado.nomesExcluidos.every((nome) => /^QAAUTO\b/i.test(nome))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Grupos de Alimento QAAUTO excluídos pela interface: ${resultado.totalExcluidos}`);
      return;
    }

    test.skip(!configuracao.nome, 'Informe no JSON o nome exato de um Grupo de Alimento QAAUTO para exclusão individual.');
    const excluido = await excluirGrupoAlimento(page, configuracao.nome);
    expect(excluido.nome).toBe(configuracao.nome);
    expect(new URL(excluido.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
