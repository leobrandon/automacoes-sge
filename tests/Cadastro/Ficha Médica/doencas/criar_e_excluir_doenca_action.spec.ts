import { expect, test } from '@playwright/test';
import { criarDoenca, excluirDoenca } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaDoenca } from '../../../../src/helpers/navigation/doenca.navigation';
import { lerConfiguracaoCriacaoDoenca } from './doenca_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Doenças', () => {
  test('cria, consulta e exclui somente as doenças criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoDoenca();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const doenca = await criarDoenca(page, configuracao.dados, sequencia);
        criadas.push(doenca.descricao);
        await expect(linhaDoenca(page, doenca.descricao)).toHaveCount(1);
        console.log(`✅ Doença criada e consultada: ${doenca.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const removida = await excluirDoenca(page, descricao);
          if (removida.descricao !== descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Doença criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Doenças desta execução.');
      }
    }
  });
});
