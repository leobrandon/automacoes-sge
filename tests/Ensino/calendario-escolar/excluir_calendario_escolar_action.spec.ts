import { expect, test } from '@playwright/test';
import { excluirCalendarioEscolar, excluirCalendariosEscolaresQAAUTO } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configExclusaoCalendarioEscolar } from './calendario_escolar_config';
test('exclui calendário QAAUTO conforme a configuração', async ({ page }) => {
  const config = configExclusaoCalendarioEscolar();
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  if (config.excluirTodosQAAUTO) {
    const excluidos = await excluirCalendariosEscolaresQAAUTO(page);
    expect(excluidos.every((nome) => /^QAAUTO\b/i.test(nome))).toBe(true);
  } else {
    expect(await excluirCalendarioEscolar(page, config.descricao)).toBe(config.descricao);
  }
});
