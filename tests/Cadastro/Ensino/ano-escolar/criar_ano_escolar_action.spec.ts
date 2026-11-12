import { expect, test } from '@playwright/test';
import { criarAnoEscolar } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaAnoEscolar } from '../../../../src/helpers/navigation/ano-escolar.navigation';
import { lerConfiguracaoCriacaoAnoEscolar } from './ano_escolar_config';

function sandboxUrl(): string {
  const baseUrl = process.env.BASE_URL || 'https://sandbox.pontoid.com.br';
  return baseUrl;
}

// Modo: REGRESSÃO AUTOMATIZADA. Os Anos Escolares criados permanecem no sandbox.
test.describe('Cadastro > Ensino > Ano Escolar', () => {
  test('cria e mantém a quantidade configurada para conferência no sandbox', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAnoEscolar();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: sandboxUrl() });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const ano = await criarAnoEscolar(page, configuracao.dados, sequencia, {
        preservarRegistroEmFalha: true,
      });

      expect(ano.nome).toMatch(/^QAAUTO\b/i);
      expect(new URL(ano.url).origin).toBe(new URL(sandboxUrl()).origin);
      await expect(linhaAnoEscolar(page, ano.nome)).toHaveCount(1);
      console.log(`✅ Ano Escolar ${sequencia}/${configuracao.quantidade} mantido para conferência: ${ano.nome}`);
    }
  });
});
