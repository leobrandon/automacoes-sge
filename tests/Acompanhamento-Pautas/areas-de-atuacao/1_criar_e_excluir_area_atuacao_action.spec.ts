import { expect, test } from '@playwright/test';
import { criarAreaAtuacao, excluirAreaAtuacao } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaAreaAtuacao } from '../../../src/helpers/navigation/area-atuacao.navigation';
import { lerConfiguracaoCriacaoAreaAtuacao } from './area_atuacao_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Área de atuação', () => {
  test('cria, consulta e exclui somente as Áreas de atuação criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAreaAtuacao();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const area = await criarAreaAtuacao(page, configuracao.dados, sequencia);
        criadas.push(area.descricao);
        await expect(linhaAreaAtuacao(page, area.descricao)).toHaveCount(1);
        console.log(`✅ Área de atuação criada e consultada: ${area.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const removida = await excluirAreaAtuacao(page, descricao);
          if (removida.descricao !== descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Área de atuação criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Áreas de atuação desta execução.');
      }
    }
  });
});
