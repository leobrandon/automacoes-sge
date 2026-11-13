import { expect, test } from '@playwright/test';
import { excluirPatrimonio } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoExclusaoPatrimonio, opcoesLoginPatrimonio } from './patrimonio_config';

// Modo: REGRESSÃO AUTOMATIZADA. A exclusão exige a placa exata de um Patrimônio QAAUTO no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Patrimônio', () => {
  test('exclui somente o Patrimônio QAAUTO identificado pela placa no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoPatrimonio();
    test.setTimeout(120000);
    await loginSge(page, opcoesLoginPatrimonio());

    const excluido = await excluirPatrimonio(page, configuracao.placa);
    expect(excluido.placa).toBe(configuracao.placa);
    expect(new URL(excluido.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
