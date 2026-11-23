import { expect, test } from '@playwright/test';
import { excluirDependenciaFisica, excluirDependenciasFisicasEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoExclusaoDependenciaFisica } from './dependencia_fisica_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão individual exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Dependência Física', () => {
  test('exclui somente a Dependência Física QAAUTO identificada no JSON (ou todas, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoDependenciaFisica();
    test.setTimeout(configuracao.excluirTodasQAAUTO ? 600000 : 120000);
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirDependenciasFisicasEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidas).toBe(resultado.descricoesExcluidas.length);
      expect(resultado.descricoesExcluidas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Dependências Físicas QAAUTO excluídas pela interface: ${resultado.totalExcluidas}`);
      return;
    }

    const excluida = await excluirDependenciaFisica(page, configuracao.descricao);
    expect(excluida.descricao).toBe(configuracao.descricao);
    expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
