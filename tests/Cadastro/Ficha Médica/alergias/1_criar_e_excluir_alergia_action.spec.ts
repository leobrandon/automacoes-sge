import { expect, test } from '@playwright/test';
import { criarAlergia, excluirAlergia } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaAlergia } from '../../../../src/helpers/navigation/alergia.navigation';
import { lerConfiguracaoCriacaoAlergia } from './alergia_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Alergias', () => {
  test('cria, consulta e exclui somente as alergias criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAlergia();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const alergia = await criarAlergia(page, configuracao.dados, sequencia);
        criadas.push(alergia.descricao);
        await expect(linhaAlergia(page, alergia.descricao)).toHaveCount(1);
        console.log(`✅ Alergia criada e consultada: ${alergia.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const removida = await excluirAlergia(page, descricao);
          if (removida.descricao !== descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Alergia criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Alergias desta execução.');
      }
    }
  });
});
