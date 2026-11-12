import { expect, test } from '@playwright/test';
import { excluirResolucao } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoResolucao } from './resolucao_config';

test('exclui a resolução QAAUTO exata configurada', async ({ page }) => {
  const descricao = lerConfiguracaoExclusaoResolucao();
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  const excluida = await excluirResolucao(page, descricao);
  expect(excluida.descricao).toBe(descricao);
});
