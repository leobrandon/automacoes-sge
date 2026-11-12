import { expect, test } from '@playwright/test';
import { criarGrupoAlimento } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaGrupoAlimento } from '../../../../src/helpers/navigation/grupo-alimento.navigation';
import { lerConfiguracaoCriacaoGrupoAlimento } from './grupo_alimento_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Alimentação Escolar > Cadastros Básicos > Grupo de Alimento', () => {
  test('cria e mantém a quantidade configurada para conferência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoGrupoAlimento();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 60000));
    await loginSge(page, { baseUrl: BASE_URL });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const grupo = await criarGrupoAlimento(page, configuracao.dados, sequencia);
      expect(grupo.nome).toMatch(/^QAAUTO\b/i);
      expect(new URL(grupo.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaGrupoAlimento(page, grupo.nome)).toHaveCount(1);
      console.log(`✅ Grupo de Alimento ${sequencia}/${configuracao.quantidade} mantido: ${grupo.nome}`);
    }
  });
});
