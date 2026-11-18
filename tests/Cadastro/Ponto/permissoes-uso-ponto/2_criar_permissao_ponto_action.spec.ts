import { expect, test } from '@playwright/test';
import { criarPermissaoPonto } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaPermissaoPonto } from '../../../../src/helpers/navigation/permissao-ponto.navigation';
import { lerConfiguracaoCriacaoPermissaoPonto } from './permissao_ponto_config';

// Modo: REGRESSÃO AUTOMATIZADA. Permissões não podem ser excluídas: os registros criados permanecem ativos.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ponto > Permissões Para Uso do Ponto', () => {
  test('cria e mantém ativa a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoPermissaoPonto();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criada = await criarPermissaoPonto(page, configuracao.dados, sequencia);
      expect(criada.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(criada.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaPermissaoPonto(page, criada.descricao)).toHaveCount(1);
      console.log(`✅ Permissão ${sequencia}/${configuracao.quantidade} mantida: ${criada.descricao}`);
    }
  });
});
