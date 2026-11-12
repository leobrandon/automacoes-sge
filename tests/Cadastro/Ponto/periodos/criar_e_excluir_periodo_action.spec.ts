import { expect, test } from '@playwright/test';
import { criarPeriodo, excluirPeriodo } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaPeriodo } from '../../../../src/helpers/navigation/periodo.navigation';
import { lerConfiguracaoCriacaoPeriodo } from './periodo_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Períodos', () => {
  test('cria, consulta e exclui somente os Períodos criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoPeriodo();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const periodo = await criarPeriodo(page, configuracao.dados, sequencia);
        criados.push(periodo.descricao);
        await expect(linhaPeriodo(page, periodo.descricao)).toHaveCount(1);
        console.log(`✅ Período criado e consultado: ${periodo.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criados.reverse()) {
        try {
          const removido = await excluirPeriodo(page, descricao);
          if (removido.descricao !== descricao) {
            throw new Error(`A ação retornou "${removido.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Período criado nesta execução removido: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Períodos desta execução.');
      }
    }
  });
});
