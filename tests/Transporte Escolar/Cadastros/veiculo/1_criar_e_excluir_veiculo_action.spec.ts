import { expect, test } from '@playwright/test';
import { criarVeiculo, excluirVeiculo } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaVeiculo } from '../../../../src/helpers/navigation/veiculo.navigation';
import { lerConfiguracaoCriacaoVeiculo } from './veiculo_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Veículos', () => {
  test('cria, consulta e exclui somente os Veículos criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoVeiculo();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const veiculo = await criarVeiculo(page, configuracao.dados, sequencia);
        criados.push(veiculo.modelo);
        await expect(linhaVeiculo(page, veiculo.modelo)).toHaveCount(1);
        console.log(`✅ Veículo criado e consultado: ${veiculo.modelo}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const modelo of criados.reverse()) {
        try {
          const removido = await excluirVeiculo(page, modelo);
          if (removido.modelo !== modelo) {
            throw new Error(`A ação retornou "${removido.modelo}" ao excluir "${modelo}".`);
          }
          console.log(`🧹 Veículo criado nesta execução removido: ${modelo}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Veículos desta execução.');
      }
    }
  });
});
