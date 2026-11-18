import { expect, test } from '@playwright/test';
import { excluirOcorrenciaEscolar, excluirOcorrenciasEscolaresEmLote } from '../../../../src/actions';
import { loginNaUnidadeEscolar } from '../../../../src/helpers/navigation/ocorrencia-escolar.navigation';
import { lerConfiguracaoExclusaoOcorrenciaEscolar } from './ocorrencia_escolar_config';

// Modo: REGRESSÃO AUTOMATIZADA. Em lote, abre cada ocorrência e exclui só as de descrição QAAUTO;
// no modo individual exige o número no JSON e também recusa o que não for QAAUTO.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Ocorrência Escolar', () => {
  test('exclui somente ocorrências QAAUTO, em lote ou pelo número informado no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoOcorrenciaEscolar();
    test.setTimeout(600000);
    await loginNaUnidadeEscolar(page, configuracao.escola, BASE_URL);

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirOcorrenciasEscolaresEmLote(page, configuracao.termoGeral);
      expect(resultado.totalExcluidas).toBe(resultado.numerosExcluidos.length);
      expect(resultado.falhas).toEqual([]);
      console.log(`🧹 Ocorrências QAAUTO excluídas: ${resultado.totalExcluidas}; preservadas (não QAAUTO): ${resultado.preservadas.length}`);
      return;
    }

    const excluida = await excluirOcorrenciaEscolar(page, configuracao.numero);
    expect(excluida.numero).toBe(configuracao.numero);
    console.log(`🧹 Ocorrência ${excluida.numero} removida: ${excluida.descricao}`);
  });
});
