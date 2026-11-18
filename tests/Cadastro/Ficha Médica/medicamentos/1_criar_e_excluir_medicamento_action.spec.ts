import { expect, test } from '@playwright/test';
import { criarMedicamento, excluirMedicamento } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaMedicamento } from '../../../../src/helpers/navigation/medicamento.navigation';
import { lerConfiguracaoCriacaoMedicamento } from './medicamento_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Medicamentos', () => {
  test('cria, consulta e exclui somente os medicamentos criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoMedicamento();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const medicamento = await criarMedicamento(page, configuracao.dados, sequencia);
        criados.push(medicamento.descricao);
        await expect(linhaMedicamento(page, medicamento.descricao)).toHaveCount(1);
        console.log(`✅ Medicamento criado e consultado: ${medicamento.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criados.reverse()) {
        try {
          const removido = await excluirMedicamento(page, descricao);
          if (removido.descricao !== descricao) {
            throw new Error(`A ação retornou "${removido.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Medicamento criado nesta execução removido: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Medicamentos desta execução.');
      }
    }
  });
});
