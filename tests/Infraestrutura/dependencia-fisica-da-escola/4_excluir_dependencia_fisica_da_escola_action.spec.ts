import { expect, test } from '@playwright/test';
import { excluirDependenciaFisicaDaEscola, excluirDependenciasFisicasDaEscolaEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoExclusaoDependenciaFisicaDaEscola } from './dependencia_fisica_da_escola_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Dependência Física da Escola', () => {
  test('exclui somente o vínculo QAAUTO identificado no JSON (ou todos, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoDependenciaFisicaDaEscola();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirDependenciasFisicasDaEscolaEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidas).toBe(resultado.excluidas.length);
      expect(resultado.excluidas.every((item) => /^QAAUTO\b/i.test(item.dependenciaFisica))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Vínculos QAAUTO de Dependência Física da Escola excluídos: ${resultado.totalExcluidas}`);
      return;
    }

    const excluida = await excluirDependenciaFisicaDaEscola(
      page,
      configuracao.dependenciaFisica,
      configuracao.escola,
    );
    expect(excluida.dependenciaFisica).toBe(configuracao.dependenciaFisica);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
