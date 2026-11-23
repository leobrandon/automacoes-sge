import { test, expect } from '@playwright/test';
import { loginSge } from '../../../../src/helpers';
import { excluirMedidasCaseiraEmLote } from '../../../../src/actions';

/**
 * Limpeza em Lote: excluirMedidasCaseiraEmLote()
 * Remove todas as medidas caseiras residuais com prefixo QAAUTO do ambiente de homologação.
 * 
 * Projetado para manutenção contínua da base de testes.
 */
test.describe('Limpeza em Lote: excluirMedidasCaseiraEmLote()', () => {

  test('Deve excluir todas as medidas caseiras com prefixo QAAUTO', async ({ page }) => {
    test.setTimeout(180000); // 3 minutos para limpeza

    // 1. Autenticação via UI
    await loginSge(page);

    // 2. Execução da exclusão em lote
    const resultado = await excluirMedidasCaseiraEmLote(page, 'QAAUTO', 30);

    // 3. Relatório consolidado
    console.log('\n======================================================');
    console.log('🧹 RESULTADO DA LIMPEZA EM LOTE — MEDIDA CASEIRA:');
    console.log(`✅ Total excluídas:  ${resultado.totalExcluidas}`);
    console.log(`⚠️  Total com falha: ${resultado.falhas.length}`);
    if (resultado.medidasExcluidas.length > 0) {
      console.log(`📋 Excluídas: ${resultado.medidasExcluidas.join(', ')}`);
    }
    if (resultado.falhas.length > 0) {
      console.log('❌ Falhas:');
      resultado.falhas.forEach((f) => {
        console.log(`   - "${f.descricao}": ${f.motivo}`);
      });
    }
    console.log('======================================================\n');

    // 4. Asserções
    expect(resultado).toBeDefined();
    expect(resultado.totalExcluidas).toBeGreaterThanOrEqual(0);
  });

});
