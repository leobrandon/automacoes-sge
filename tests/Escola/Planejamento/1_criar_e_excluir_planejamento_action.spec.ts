import { test } from '@playwright/test';
import { criarPlanejamentoEscola, excluirPlanejamentoEscola, filtroPlanejamentoEscola } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { entrarNaVisaoUnidadeEscolar } from '../../../src/helpers/navigation/planejamento-escola.navigation';
import { lerConfiguracaoCriacaoPlanejamentoEscola } from './planejamento_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os planejamentos criados nesta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Planejamento', () => {
  test('cria, confere na grade e exclui somente os planejamentos criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoPlanejamentoEscola();
    test.setTimeout(Math.max(240000, configuracao.quantidade * 150000));
    await loginSge(page, { baseUrl: BASE_URL });
    await entrarNaVisaoUnidadeEscolar(page, configuracao.escola);

    const criados: string[] = [];
    const falhas: Error[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        // O período é registrado assim que o salvamento confirma: uma falha na conferência não deixa resíduo.
        const criado = await criarPlanejamentoEscola(page, configuracao.dados, {
          aoSalvar: ({ periodo }) => criados.push(periodo),
        });
        console.log(`✅ Planejamento criado e conferido: ${criado.periodo}`);
      }
    } catch (erro) {
      falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
    } finally {
      const filtro = filtroPlanejamentoEscola(configuracao.dados);
      for (const periodo of criados.reverse()) {
        try {
          await excluirPlanejamentoEscola(page, filtro, periodo);
          console.log(`🧹 Planejamento criado nesta execução removido: ${periodo}`);
        } catch (erro) {
          falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhas.length > 0) {
        throw new AggregateError(falhas, 'Falha no ciclo de Planejamento (criação ou limpeza).');
      }
    }
  });
});
