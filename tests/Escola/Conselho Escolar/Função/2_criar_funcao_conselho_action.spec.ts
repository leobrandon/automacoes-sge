import { expect, test } from '@playwright/test';
import { criarFuncaoConselho } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaFuncaoConselho } from '../../../../src/helpers/navigation/funcao-conselho.navigation';
import { lerConfiguracaoCriacaoFuncaoConselho } from './funcao_conselho_config';

// Modo: REGRESSÃO AUTOMATIZADA. As funções criadas permanecem para conferência (visão Secretaria).
// Uma nova execução exige antes excluir_funcao_conselho_action.spec.ts (a descrição `... 1` já existiria).
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Escola > Conselho Escolar > Função', () => {
  test('cria e mantém a quantidade configurada para conferência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoFuncaoConselho();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 90000));
    await loginSge(page, { baseUrl: BASE_URL });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const funcao = await criarFuncaoConselho(page, configuracao.dados, sequencia);
      expect(funcao.descricao).toMatch(/^QAAUTO\b/i);
      expect(funcao.descricao).toMatch(new RegExp(` ${sequencia}$`));
      expect(new URL(funcao.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaFuncaoConselho(page, funcao.descricao)).toHaveCount(1);
      console.log(`✅ Função ${sequencia}/${configuracao.quantidade} mantida: ${funcao.descricao}`);
    }
  });
});
