import { expect, test } from '@playwright/test';
import { criarAtividadeAee, excluirAtividadeAee } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaAtividadeAee } from '../../../../src/helpers/navigation/atividade-aee.navigation';
import { lerConfiguracaoCriacaoAtividadeAee } from './atividade_aee_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Atividades de AEE', () => {
  test('cria, consulta e exclui somente as atividades criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAtividadeAee();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const atividade = await criarAtividadeAee(page, configuracao.dados, sequencia);
        criadas.push(atividade.descricao);
        await expect(linhaAtividadeAee(page, atividade.descricao)).toHaveCount(1);
        console.log(`✅ Atividade de AEE criada e consultada: ${atividade.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const removida = await excluirAtividadeAee(page, descricao);
          if (removida.descricao !== descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Atividade de AEE criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Atividades de AEE desta execução.');
      }
    }
  });
});
