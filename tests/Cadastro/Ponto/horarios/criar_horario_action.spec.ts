import { expect, test } from '@playwright/test';
import { criarHorario } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaHorario } from '../../../../src/helpers/navigation/horario.navigation';
import { lerConfiguracaoCriacaoHorario } from './horario_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ponto > Horários', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoHorario();
    test.setTimeout(Math.max(240000, configuracao.quantidade * 180000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criado = await criarHorario(page, configuracao.dados, sequencia);
      expect(criado.descricao).toMatch(/^QAAUTO\b/i);
      expect(new URL(criado.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaHorario(page, criado.descricao)).toHaveCount(1);
      console.log(`✅ Horário ${sequencia}/${configuracao.quantidade} mantido: ${criado.descricao}`);
    }
  });
});
