import { expect, test } from '@playwright/test';
import { criarFuncaoConselho, excluirFuncaoConselho, validarRecusasFuncaoConselho } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaFuncaoConselho } from '../../../../src/helpers/navigation/funcao-conselho.navigation';
import { lerConfiguracaoCriacaoFuncaoConselho } from './funcao_conselho_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas as funções criadas nesta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Função do Conselho Escolar', () => {
  test('confere as recusas, cria, consulta e exclui somente as funções criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoFuncaoConselho();
    test.setTimeout(Math.max(240000, configuracao.quantidade * 150000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criadas: string[] = [];
    const falhas: Error[] = [];
    try {
      await validarRecusasFuncaoConselho(page);
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const funcao = await criarFuncaoConselho(page, configuracao.dados, sequencia);
        criadas.push(funcao.descricao);
        await expect(linhaFuncaoConselho(page, funcao.descricao)).toHaveCount(1);
        console.log(`✅ Função criada e consultada: ${funcao.descricao}`);
      }
    } catch (erro) {
      falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
    } finally {
      for (const descricao of criadas.reverse()) {
        try {
          const removida = await excluirFuncaoConselho(page, descricao);
          if (removida.descricao !== descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Função criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhas.length > 0) {
        throw new AggregateError(falhas, 'Falha no ciclo de Função do Conselho Escolar (recusas, criação ou limpeza).');
      }
    }
  });
});
