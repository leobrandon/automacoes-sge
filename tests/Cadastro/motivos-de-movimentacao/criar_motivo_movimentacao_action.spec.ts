import { expect, test } from '@playwright/test';
import { criarMotivoMovimentacao } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaMotivoMovimentacao } from '../../../src/helpers/navigation/motivo-movimentacao.navigation';
import { lerConfiguracaoCriacaoMotivoMovimentacao } from './motivo_movimentacao_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Motivos de Movimentação', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoMotivoMovimentacao();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O login no ambiente é lento; o padrão de 20 s do helper não basta (mesmo ajuste de Períodos).
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criado = await criarMotivoMovimentacao(page, configuracao.dados, sequencia);
      expect(criado.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(criado.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaMotivoMovimentacao(page, criado.descricao)).toHaveCount(1);
      console.log(`✅ Motivo ${sequencia}/${configuracao.quantidade} mantido: ${criado.descricao}`);
    }
  });
});
