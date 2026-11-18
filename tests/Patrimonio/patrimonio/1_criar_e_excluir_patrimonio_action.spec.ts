import { expect, test } from '@playwright/test';
import { criarPatrimonio, excluirPatrimonio } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaPatrimonio } from '../../../src/helpers/navigation/patrimonio.navigation';
import { lerConfiguracaoCriacaoPatrimonio, opcoesLoginPatrimonio } from './patrimonio_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Patrimônio', () => {
  test('cria, consulta e exclui somente os Patrimônios criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoPatrimonio();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, opcoesLoginPatrimonio());

    const criados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const patrimonio = await criarPatrimonio(page, configuracao.dados, sequencia);
        criados.push(patrimonio.placa);
        await expect(linhaPatrimonio(page, patrimonio.placa)).toHaveCount(1);
        console.log(`✅ Patrimônio criado e consultado: ${patrimonio.placa}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const placa of criados.reverse()) {
        try {
          const removido = await excluirPatrimonio(page, placa);
          if (removido.placa !== placa) {
            throw new Error(`A ação retornou "${removido.placa}" ao excluir "${placa}".`);
          }
          console.log(`🧹 Patrimônio criado nesta execução removido: ${placa}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Patrimônios desta execução.');
      }
    }
  });
});
