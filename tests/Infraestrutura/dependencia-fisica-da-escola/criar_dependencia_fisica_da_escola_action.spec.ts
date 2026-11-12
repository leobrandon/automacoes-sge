import { expect, test } from '@playwright/test';
import { criarDependenciaFisicaDaEscola } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaDependenciaFisicaDaEscola } from '../../../src/helpers/navigation/dependencia-fisica-da-escola.navigation';
import { lerConfiguracaoCriacaoDependenciaFisicaDaEscola } from './dependencia_fisica_da_escola_config';

// Modo: REGRESSÃO AUTOMATIZADA. Os registros criados permanecem no ambiente para conferência.
// Pré-condição: Dependências Físicas "QAAUTO Dependencia Fisica 1..N" (criar_dependencia_fisica_action).
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Infraestrutura > Dependência Física da Escola', () => {
  test('cria e mantém a quantidade configurada para conferência no ambiente', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoDependenciaFisicaDaEscola();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criada = await criarDependenciaFisicaDaEscola(page, configuracao.dados, sequencia);
      expect(criada.dependenciaFisica).toMatch(/^QAAUTO\b/i);
      expect(new URL(criada.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaDependenciaFisicaDaEscola(page, criada.dependenciaFisica, criada.escola)).toHaveCount(1);
      console.log(
        `✅ Dependência Física da Escola ${sequencia}/${configuracao.quantidade} mantida: ${criada.dependenciaFisica}`,
      );
    }
  });
});
