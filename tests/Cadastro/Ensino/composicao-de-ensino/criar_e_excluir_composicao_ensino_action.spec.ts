import { expect, test } from '@playwright/test';
import {
  criarComposicaoEnsino,
  excluirComposicaoEnsino,
} from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaComposicaoEnsino } from '../../../../src/helpers/navigation/composicao-ensino.navigation';
import { lerConfiguracaoCriacaoComposicaoEnsino } from './composicao_ensino_config';

// Modo: REGRESSÃO AUTOMATIZADA. O teardown remove somente os registros criados pelo teste.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Composição de Ensino', () => {
  test('cria, consulta e exclui somente os registros criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoComposicaoEnsino();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criadas: string[] = [];
    try {
      for (let indice = 1; indice <= configuracao.quantidade; indice++) {
        const composicao = await criarComposicaoEnsino(page, configuracao.dados, indice);
        criadas.push(composicao.descricao);
        await expect(linhaComposicaoEnsino(page, composicao.descricao)).toHaveCount(1);
        console.log(`✅ Composição criada e consultada: ${composicao.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const excluida = await excluirComposicaoEnsino(page, descricao);
          if (excluida.descricao !== descricao) {
            throw new Error(`A ação retornou "${excluida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Composição criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais composições desta execução.');
      }
    }
  });
});
