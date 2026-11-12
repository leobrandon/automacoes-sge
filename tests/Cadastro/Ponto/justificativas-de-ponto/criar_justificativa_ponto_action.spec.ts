import { expect, test } from '@playwright/test';
import { criarJustificativaPonto } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaJustificativaPonto } from '../../../../src/helpers/navigation/justificativa-ponto.navigation';
import { lerConfiguracaoCriacaoJustificativaPonto } from './justificativa_ponto_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ponto > Justificativa', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoJustificativaPonto();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criada = await criarJustificativaPonto(page, configuracao.dados, sequencia);
      expect(criada.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(criada.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaJustificativaPonto(page, criada.descricao)).toHaveCount(1);
      console.log(`✅ Justificativa de Ponto ${sequencia}/${configuracao.quantidade} mantida: ${criada.descricao}`);
    }
  });
});
