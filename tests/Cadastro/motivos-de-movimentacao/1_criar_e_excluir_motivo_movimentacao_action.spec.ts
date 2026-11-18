import { expect, test } from '@playwright/test';
import { criarMotivoMovimentacao, excluirMotivoMovimentacao } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaMotivoMovimentacao } from '../../../src/helpers/navigation/motivo-movimentacao.navigation';
import { lerConfiguracaoCriacaoMotivoMovimentacao } from './motivo_movimentacao_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Motivos de Movimentação', () => {
  test('cria, consulta e exclui somente os Motivos criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoMotivoMovimentacao();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O login no ambiente é lento; o padrão de 20 s do helper não basta (mesmo ajuste de Períodos).
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const motivo = await criarMotivoMovimentacao(page, configuracao.dados, sequencia);
        criados.push(motivo.descricao);
        await expect(linhaMotivoMovimentacao(page, motivo.descricao)).toHaveCount(1);
        console.log(`✅ Motivo criado e consultado: ${motivo.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criados.reverse()) {
        try {
          const removido = await excluirMotivoMovimentacao(page, descricao);
          if (removido.descricao !== descricao) {
            throw new Error(`A ação retornou "${removido.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Motivo criado nesta execução removido: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Motivos desta execução.');
      }
    }
  });
});
