import { expect, test } from '@playwright/test';
import { criarConceito, excluirConceito } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaConceito } from '../../../../src/helpers/navigation/conceito.navigation';
import { lerConfiguracaoCriacaoConceito } from './conceito_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove somente os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Conceitos', () => {
  test('cria, consulta e exclui somente os conceitos criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoConceito('dados_conceito_ciclo.json');
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const conceito = await criarConceito(page, configuracao.dados, sequencia);
        criados.push(conceito.descricao);
        await expect(linhaConceito(page, conceito.descricao)).toHaveCount(1);
        console.log(`✅ Conceito criado e consultado: ${conceito.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criados.reverse()) {
        try {
          console.log(`🗑️ Iniciando remoção do Conceito criado nesta execução: ${descricao}`);
          const excluido = await excluirConceito(page, descricao);
          if (excluido.descricao !== descricao) {
            throw new Error(`A ação retornou "${excluido.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Conceito criado nesta execução removido: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Conceitos criados nesta execução.');
      }
    }
  });
});
