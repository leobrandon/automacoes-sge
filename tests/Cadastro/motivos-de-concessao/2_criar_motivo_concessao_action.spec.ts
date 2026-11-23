import { expect, test } from '@playwright/test';
import { criarMotivoConcessao } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaMotivoConcessao } from '../../../src/helpers/navigation/motivo-concessao.navigation';
import { lerConfiguracaoCriacaoMotivoConcessao } from './motivo_concessao_config';

// Modo: REGRESSÃO AUTOMATIZADA. Motivos não podem ser excluídos: os registros criados permanecem ativos.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Motivos de Concessão', () => {
  test('cria e mantém ativa a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoMotivoConcessao();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criado = await criarMotivoConcessao(page, configuracao.dados, sequencia);
      expect(criado.titulo).toMatch(/^QAAUTO\b/i);
      expect(new URL(criado.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaMotivoConcessao(page, criado.titulo)).toHaveCount(1);
      console.log(`✅ Motivo de Concessão ${sequencia}/${configuracao.quantidade} mantido: ${criado.titulo}`);
    }
  });
});
