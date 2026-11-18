import { expect, test } from '@playwright/test';
import { concluirAcompanhamento } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoConclusaoAcompanhamento } from './acompanhamento_config';

// Modo: REGRESSÃO AUTOMATIZADA (visão Secretaria). Concluir é irreversível: o acompanhamento passa a somente
// leitura. É o único encerramento da tela, que não oferece exclusão de acompanhamento.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Conclusão configurável de Acompanhamento', () => {
  test('conclui somente o Acompanhamento QAAUTO identificado no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoConclusaoAcompanhamento();
    test.setTimeout(120000);
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const concluido = await concluirAcompanhamento(page, configuracao);
    expect(concluido.tipoPauta).toBe(configuracao.tipoPauta);
    expect(new URL(concluido.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
