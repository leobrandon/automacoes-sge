import { test } from '@playwright/test';
import { excluirTipoRefeicao } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { configExclusaoTipoRefeicao } from './tipo_refeicao_config';
test('exclui tipo de refeição QAAUTO exato', async ({ page }) => {
  const nome = configExclusaoTipoRefeicao();
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  await excluirTipoRefeicao(page, nome);
});
