import { expect, test } from '@playwright/test';
import { criarAtividadeFisica } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaAtividadeFisica } from '../../../../src/helpers/navigation/atividade-fisica.navigation';
import { lerConfiguracaoCriacaoAtividadeFisica } from './atividade_fisica_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ficha Médica > Atividades Físicas', () => {
  test('cria e mantém a quantidade configurada para conferência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAtividadeFisica();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 60000));
    await loginSge(page, { baseUrl: BASE_URL });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const atividade = await criarAtividadeFisica(page, configuracao.dados, sequencia);
      expect(atividade.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(atividade.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaAtividadeFisica(page, atividade.descricao)).toHaveCount(1);
      console.log(`✅ Atividade Física ${sequencia}/${configuracao.quantidade} mantida: ${atividade.descricao}`);
    }
  });
});
