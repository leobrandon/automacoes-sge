import { expect, test } from '@playwright/test';
import { criarFichaAvaliativa } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaFichaAvaliativa } from '../../../../src/helpers/navigation/ficha-avaliativa.navigation';
import { buildFichaAvaliativa } from '../../../../src/factories/ficha-avaliativa.factory';
import { lerConfiguracaoCriacaoFichaAvaliativa } from './ficha_avaliativa_config';

function sandboxUrl(): string {
  const baseUrl = process.env.BASE_URL || 'https://sandbox.pontoid.com.br';
  return baseUrl;
}

// Modo: REGRESSÃO AUTOMATIZADA. A ficha e seus filhos ficam no sandbox para conferência.
test.describe('Cadastro > Ensino > Ficha Avaliativa', () => {
  test('cria ficha, informação complementar, agrupador, tópico e desempenho final', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoFichaAvaliativa();
    test.setTimeout(Math.max(240000, configuracao.quantidade * 180000));
    await loginSge(page, { baseUrl: sandboxUrl() });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criada = await criarFichaAvaliativa(page, configuracao.dados, sequencia);
      expect(criada.sequencia).toBeGreaterThanOrEqual(sequencia);
      const esperado = buildFichaAvaliativa(configuracao.dados, criada.sequencia);

      expect(criada.descricao).toBe(esperado.descricao);
      expect(new URL(criada.url).origin).toBe(new URL(sandboxUrl()).origin);
      await expect(linhaFichaAvaliativa(page, criada.descricao)).toHaveCount(1);
      expect(criada.informacaoComplementar).toBe(esperado.informacaoComplementar);
      expect(criada.agrupador).toBe(esperado.agrupador);
      expect(criada.topico).toBe(esperado.topico);
      expect(criada.desempenhoFinal).toBe(esperado.desempenhoFinal);
      console.log(`✅ Ficha Avaliativa e seus registros filhos mantidos para conferência: ${criada.descricao}`);
    }
  });
});
