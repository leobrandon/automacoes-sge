import { expect, test } from '@playwright/test';
import { criarJustificativaPonto, excluirJustificativaPonto } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaJustificativaPonto } from '../../../../src/helpers/navigation/justificativa-ponto.navigation';
import { lerConfiguracaoCriacaoJustificativaPonto } from './justificativa_ponto_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Justificativas de Ponto', () => {
  test('cria, consulta e exclui somente as Justificativas criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoJustificativaPonto();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const justificativa = await criarJustificativaPonto(page, configuracao.dados, sequencia);
        criadas.push(justificativa.descricao);
        await expect(linhaJustificativaPonto(page, justificativa.descricao)).toHaveCount(1);
        console.log(`✅ Justificativa de Ponto criada e consultada: ${justificativa.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const removida = await excluirJustificativaPonto(page, descricao);
          if (removida.descricao !== descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Justificativa de Ponto criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Justificativas de Ponto desta execução.');
      }
    }
  });
});
