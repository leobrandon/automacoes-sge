import { expect, test } from '@playwright/test';
import {
  criarMetricaAcompanhamento,
  excluirMetricaAcompanhamento,
  type MetricaAcompanhamentoCriada,
} from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaMetricaAcompanhamento } from '../../../src/helpers/navigation/metrica-acompanhamento.navigation';
import { lerConfiguracaoCriacaoMetricaAcompanhamento } from './metrica_acompanhamento_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Métrica', () => {
  test('cria, consulta e exclui somente as Métricas criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoMetricaAcompanhamento();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criadas: MetricaAcompanhamentoCriada[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const metrica = await criarMetricaAcompanhamento(page, configuracao.dados, sequencia);
        criadas.push(metrica);
        await expect(
          linhaMetricaAcompanhamento(page, metrica.classificacao, metrica.pontuacaoMinima, metrica.pontuacaoMaxima),
        ).toHaveCount(1);
        console.log(`✅ Métrica criada e consultada: ${metrica.classificacao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const metrica of criadas.reverse()) {
        try {
          const removida = await excluirMetricaAcompanhamento(page, metrica);
          if (removida.classificacao !== metrica.classificacao) {
            throw new Error(`A ação retornou "${removida.classificacao}" ao excluir "${metrica.classificacao}".`);
          }
          console.log(`🧹 Métrica criada nesta execução removida: ${metrica.classificacao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Métricas desta execução.');
      }
    }
  });
});
