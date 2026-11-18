import { expect, test } from '@playwright/test';
import { criarAreaAtuacao } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaAreaAtuacao } from '../../../src/helpers/navigation/area-atuacao.navigation';
import { lerConfiguracaoCriacaoAreaAtuacao } from './area_atuacao_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Acompanhamento/Pautas > Áreas de atuação', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAreaAtuacao();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criada = await criarAreaAtuacao(page, configuracao.dados, sequencia);
      expect(criada.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(criada.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaAreaAtuacao(page, criada.descricao)).toHaveCount(1);
      console.log(`✅ Área de atuação ${sequencia}/${configuracao.quantidade} mantida: ${criada.descricao}`);
    }
  });
});
