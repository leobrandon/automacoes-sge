import { expect, test } from '@playwright/test';
import { criarClassificacaoUnidades, excluirClassificacaoUnidades } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaClassificacaoUnidades } from '../../../src/helpers/navigation/classificacao-unidades.navigation';
import { lerConfiguracaoCriacaoClassificacaoUnidades } from './classificacao_unidades_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Classificações de Unidades', () => {
  test('cria, consulta e exclui somente as Classificações criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoClassificacaoUnidades();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O login no ambiente é lento; o padrão de 20 s do helper não basta (mesmo ajuste de Períodos).
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const classificacao = await criarClassificacaoUnidades(page, configuracao.dados, sequencia);
        criadas.push(classificacao.descricao);
        await expect(linhaClassificacaoUnidades(page, classificacao.descricao)).toHaveCount(1);
        console.log(`✅ Classificação criada e consultada: ${classificacao.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const removida = await excluirClassificacaoUnidades(page, descricao);
          if (removida.descricao !== descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Classificação criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Classificações desta execução.');
      }
    }
  });
});
