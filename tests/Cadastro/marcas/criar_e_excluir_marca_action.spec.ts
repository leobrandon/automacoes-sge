import { expect, test } from '@playwright/test';
import { criarMarca, excluirMarca } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaMarca } from '../../../src/helpers/navigation/marca.navigation';
import { lerConfiguracaoCriacaoMarca } from './marca_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Marcas', () => {
  test('cria, consulta e exclui somente as Marcas criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoMarca();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O login no ambiente é lento; o padrão de 20 s do helper não basta (mesmo ajuste de Períodos).
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const marca = await criarMarca(page, configuracao.dados, sequencia);
        criadas.push(marca.descricao);
        await expect(linhaMarca(page, marca.descricao)).toHaveCount(1);
        console.log(`✅ Marca criada e consultada: ${marca.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const removida = await excluirMarca(page, descricao);
          if (removida.descricao !== descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Marca criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Marcas desta execução.');
      }
    }
  });
});
