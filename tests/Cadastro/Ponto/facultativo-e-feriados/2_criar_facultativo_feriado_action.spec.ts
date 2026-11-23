import { expect, test } from '@playwright/test';
import { criarFacultativoFeriado } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaFacultativoFeriado } from '../../../../src/helpers/navigation/facultativo-feriado.navigation';
import { lerConfiguracaoCriacaoFacultativoFeriado } from './facultativo_feriado_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Cadastro > Ponto > Facultativo e Feriados', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoFacultativoFeriado();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criado = await criarFacultativoFeriado(page, configuracao.dados, sequencia);
      expect(criado.descricao).toMatch(/^QAAUTO\b/i);
      expect(criado.facultativo).toBe(configuracao.dados.facultativo ?? false);
      expect(new URL(criado.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaFacultativoFeriado(page, criado.descricao)).toHaveCount(1);
      console.log(`✅ Feriado/Facultativo ${sequencia}/${configuracao.quantidade} mantido: ${criado.descricao} | ${criado.data}`);
    }
  });
});
