import { expect, test } from '@playwright/test';
import { criarRestricaoAlimentar, excluirRestricaoAlimentar } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaRestricaoAlimentar } from '../../../../src/helpers/navigation/restricao-alimentar.navigation';
import { lerConfiguracaoCriacaoRestricaoAlimentar } from './restricao_alimentar_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Restrições Alimentares', () => {
  test('cria, consulta e exclui somente as restrições alimentares criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoRestricaoAlimentar();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const restricao = await criarRestricaoAlimentar(page, configuracao.dados, sequencia);
        criadas.push(restricao.descricao);
        await expect(linhaRestricaoAlimentar(page, restricao.descricao)).toHaveCount(1);
        console.log(`✅ Restrição alimentar criada e consultada: ${restricao.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const removida = await excluirRestricaoAlimentar(page, descricao);
          if (removida.descricao !== descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Restrição alimentar criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Restrições Alimentares desta execução.');
      }
    }
  });
});
