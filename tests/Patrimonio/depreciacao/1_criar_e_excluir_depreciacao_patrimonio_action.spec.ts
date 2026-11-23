import { expect, test } from '@playwright/test';
import { criarDepreciacaoPatrimonio, excluirDepreciacaoPatrimonio } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaDepreciacaoPatrimonio } from '../../../src/helpers/navigation/depreciacao-patrimonio.navigation';
import { lerConfiguracaoCriacaoDepreciacaoPatrimonio } from './depreciacao_patrimonio_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Depreciação (Patrimônio)', () => {
  test('cria, consulta e exclui somente as Depreciações criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoDepreciacaoPatrimonio();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const depreciacao = await criarDepreciacaoPatrimonio(page, configuracao.dados, sequencia);
        criadas.push(depreciacao.descricao);
        await expect(linhaDepreciacaoPatrimonio(page, depreciacao.descricao)).toHaveCount(1);
        console.log(`✅ Depreciação criada e consultada: ${depreciacao.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const removida = await excluirDepreciacaoPatrimonio(page, descricao);
          if (removida.descricao !== descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Depreciação criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Depreciações desta execução.');
      }
    }
  });
});
