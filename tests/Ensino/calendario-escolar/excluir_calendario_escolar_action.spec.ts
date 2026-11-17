import { expect, test } from '@playwright/test';
import { criarCalendarioEscolar, excluirCalendarioEscolar } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configCalendarioEscolar, dadosCalendarioSemAnoComposicao } from './calendario_escolar_config';
test('exclui somente o calendário QAAUTO criado nesta spec', async ({ page }) => {
  const config = configCalendarioEscolar();
  test.setTimeout(Math.max(180000, config.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  for (let i = 1; i <= config.quantidade; i++) {
    const nome = await criarCalendarioEscolar(
      page,
      dadosCalendarioSemAnoComposicao(config.dados),
      i,
    );
    expect(await excluirCalendarioEscolar(page, nome)).toBe(nome);
  }
});
