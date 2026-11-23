import { expect, test } from '@playwright/test';
import { criarGrupoAlimento, excluirGrupoAlimento } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaGrupoAlimento } from '../../../../src/helpers/navigation/grupo-alimento.navigation';
import { lerConfiguracaoCriacaoGrupoAlimento } from './grupo_alimento_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Grupo de Alimento', () => {
  test('cria, consulta e exclui somente os Grupos de Alimento criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoGrupoAlimento();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const grupo = await criarGrupoAlimento(page, configuracao.dados, sequencia);
        criados.push(grupo.nome);
        await expect(linhaGrupoAlimento(page, grupo.nome)).toHaveCount(1);
        console.log(`✅ Grupo de Alimento criado e consultado: ${grupo.nome}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const nome of criados.reverse()) {
        try {
          const removido = await excluirGrupoAlimento(page, nome);
          if (removido.nome !== nome) {
            throw new Error(`A ação retornou "${removido.nome}" ao excluir "${nome}".`);
          }
          console.log(`🧹 Grupo de Alimento criado nesta execução removido: ${nome}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Grupos de Alimento desta execução.');
      }
    }
  });
});
