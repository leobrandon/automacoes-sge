import { expect, test } from '@playwright/test';
import { criarSalaDeAula } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaSalaDeAula } from '../../../src/helpers/navigation/sala-de-aula.navigation';
import { lerConfiguracaoCriacaoSalaDeAula } from './sala_de_aula_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Infraestrutura > Sala de Aula', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoSalaDeAula();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criada = await criarSalaDeAula(page, configuracao.dados, sequencia);
      expect(criada.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(criada.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaSalaDeAula(page, criada.descricao, criada.escola)).toHaveCount(1);
      console.log(`✅ Sala de Aula ${sequencia}/${configuracao.quantidade} mantida: ${criada.descricao}`);
    }
  });
});
