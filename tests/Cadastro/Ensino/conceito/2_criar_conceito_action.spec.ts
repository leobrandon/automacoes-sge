import { expect, test } from '@playwright/test';
import { criarConceito } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoCriacaoConceito } from './conceito_config';

// Modo: REGRESSÃO AUTOMATIZADA. O registro permanece disponível após a validação.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Criação e manutenção de Conceito', () => {
  test('cria e mantém os conceitos configurados no sandbox', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoConceito();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criados: string[] = [];
    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const conceito = await criarConceito(page, configuracao.dados, sequencia);
      criados.push(conceito.descricao);
      expect(new URL(conceito.url).origin).toBe(new URL(BASE_URL).origin);
    }
    expect(criados).toHaveLength(configuracao.quantidade);
  });
});
