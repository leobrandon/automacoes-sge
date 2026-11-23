import { expect, test } from '@playwright/test';
import { criarComposicaoEnsino } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaComposicaoEnsino } from '../../../../src/helpers/navigation/composicao-ensino.navigation';
import { lerConfiguracaoCriacaoComposicaoEnsino } from './composicao_ensino_config';

// Modo: REGRESSÃO AUTOMATIZADA. Navegação visual, auto-waiting e sem delays artificiais.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ensino > Composição De Ensino', () => {
  test('cria e mantém a quantidade configurada para conferência no sandbox', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoComposicaoEnsino();
    test.setTimeout(Math.max(120000, configuracao.quantidade * 60000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criadas: string[] = [];
    for (let indice = 1; indice <= configuracao.quantidade; indice++) {
      const composicao = await criarComposicaoEnsino(page, configuracao.dados, indice);
      criadas.push(composicao.descricao);

      expect(composicao.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(composicao.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaComposicaoEnsino(page, composicao.descricao)).toHaveCount(1);
      console.log(`✅ Composição ${indice}/${configuracao.quantidade}: ${composicao.descricao}`);
    }

    console.log(`✅ Total de Composições de Ensino mantidas: ${criadas.length}`);
  });
});
