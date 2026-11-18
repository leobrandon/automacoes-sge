import { expect, test } from '@playwright/test';
import { criarItem, excluirItem } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaItem } from '../../../src/helpers/navigation/item.navigation';
import { lerConfiguracaoCriacaoItem } from './item_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Item', () => {
  test('cria, consulta e exclui somente os Itens criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoItem();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const item = await criarItem(page, configuracao.dados, sequencia, (descricao) => {
          criadas.push(descricao);
        });
        await expect(linhaItem(page, item.descricao)).toHaveCount(1);
        console.log(`✅ Item criado e consultado: ${item.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const removido = await excluirItem(page, descricao);
          if (removido.descricao !== descricao) {
            throw new Error(`A ação retornou "${removido.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Item criado nesta execução removido: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Itens desta execução.');
      }
    }
  });
});
