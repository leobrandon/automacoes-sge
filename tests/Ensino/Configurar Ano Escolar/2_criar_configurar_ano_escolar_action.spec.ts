import { expect, test } from '@playwright/test';
import { criarConfiguracaoAnoEscolar } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { configConfiguracaoAnoEscolar } from './configurar_ano_escolar_config';

test('configura o ano escolar na composição de ensino do calendário QAAUTO', async ({ page }) => {
  const dados = configConfiguracaoAnoEscolar();
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  await criarConfiguracaoAnoEscolar(page, dados);
  // A action termina com o registro persistido aberto para edição.
  const main = page.locator('#main');
  await expect(main.locator('#Id')).not.toHaveValue('0');
  await expect(main.locator('#SerieId option:checked')).toHaveText(dados.anoEscolar);
});
