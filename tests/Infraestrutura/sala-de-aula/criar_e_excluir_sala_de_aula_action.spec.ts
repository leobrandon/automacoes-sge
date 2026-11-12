import { expect, test } from '@playwright/test';
import { criarSalaDeAula, excluirSalaDeAula } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaSalaDeAula } from '../../../src/helpers/navigation/sala-de-aula.navigation';
import { lerConfiguracaoCriacaoSalaDeAula } from './sala_de_aula_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Sala de Aula', () => {
  test('cria, consulta e exclui somente as Salas de Aula criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoSalaDeAula();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criadas: Array<{ descricao: string; escola: string }> = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const criada = await criarSalaDeAula(page, configuracao.dados, sequencia);
        criadas.push({ descricao: criada.descricao, escola: criada.escola });
        await expect(linhaSalaDeAula(page, criada.descricao, criada.escola)).toHaveCount(1);
        console.log(`✅ Sala de Aula criada e consultada: ${criada.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const item of criadas.reverse()) {
        try {
          const removida = await excluirSalaDeAula(page, item.descricao, item.escola);
          if (removida.descricao !== item.descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${item.descricao}".`);
          }
          console.log(`🧹 Sala de Aula criada nesta execução removida: ${item.descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Salas de Aula desta execução.');
      }
    }
  });
});
