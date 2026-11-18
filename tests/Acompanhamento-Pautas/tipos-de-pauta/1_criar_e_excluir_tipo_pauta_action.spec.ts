import { expect, test } from '@playwright/test';
import { criarTipoPauta, excluirTipoPauta } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaTipoPauta } from '../../../src/helpers/navigation/tipo-pauta.navigation';
import { lerConfiguracaoCriacaoTipoPauta } from './tipo_pauta_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Tipo de pauta', () => {
  test('cria, consulta e exclui somente os Tipos de pauta criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoTipoPauta();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const pauta = await criarTipoPauta(page, configuracao.dados, sequencia);
        criados.push(pauta.nome);
        await expect(linhaTipoPauta(page, pauta.nome)).toHaveCount(1);
        console.log(`✅ Tipo de pauta criado e consultado: ${pauta.nome}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const nome of criados.reverse()) {
        try {
          const removido = await excluirTipoPauta(page, nome);
          if (removido.nome !== nome) {
            throw new Error(`A ação retornou "${removido.nome}" ao excluir "${nome}".`);
          }
          console.log(`🧹 Tipo de pauta criado nesta execução removido: ${nome}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Tipos de pauta desta execução.');
      }
    }
  });
});
