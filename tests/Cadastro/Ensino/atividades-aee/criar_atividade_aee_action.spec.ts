import { expect, test } from '@playwright/test';
import { criarAtividadeAee } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaAtividadeAee } from '../../../../src/helpers/navigation/atividade-aee.navigation';
import { lerConfiguracaoCriacaoAtividadeAee } from './atividade_aee_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no sandbox.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ensino > Atividades de AEE', () => {
  test('cria e mantém a quantidade configurada para conferência no sandbox', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAtividadeAee();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 60000));
    await loginSge(page, { baseUrl: BASE_URL });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const atividade = await criarAtividadeAee(page, configuracao.dados, sequencia);
      expect(atividade.descricao).toMatch(/^QAAUTO\b/i);
      expect(atividade.descricao).toMatch(new RegExp(` ${sequencia}$`));
      expect(new URL(atividade.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaAtividadeAee(page, atividade.descricao)).toHaveCount(1);
      console.log(`✅ Atividade de AEE ${sequencia}/${configuracao.quantidade} mantida: ${atividade.descricao}`);
    }
  });
});
