import { expect, test } from '@playwright/test';
import { criarClassificacaoUnidades } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaClassificacaoUnidades } from '../../../src/helpers/navigation/classificacao-unidades.navigation';
import { lerConfiguracaoCriacaoClassificacaoUnidades } from './classificacao_unidades_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Classificação de Unidades Educacionais', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoClassificacaoUnidades();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O login no ambiente é lento; o padrão de 20 s do helper não basta (mesmo ajuste de Períodos).
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criada = await criarClassificacaoUnidades(page, configuracao.dados, sequencia);
      expect(criada.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(criada.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaClassificacaoUnidades(page, criada.descricao)).toHaveCount(1);
      console.log(`✅ Classificação ${sequencia}/${configuracao.quantidade} mantida: ${criada.descricao}`);
    }
  });
});
