import { expect, test } from '@playwright/test';
import { criarResolucao } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaResolucao } from '../../../../src/helpers/navigation/resolucao.navigation';
import { lerConfiguracaoCriacaoResolucao } from './resolucao_config';

test('cria e mantém as resoluções configuradas', async ({ page }) => {
  const config = lerConfiguracaoCriacaoResolucao();
  test.setTimeout(Math.max(180000, config.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  for (let i = 0; i < config.quantidade; i++) {
    const criada = await criarResolucao(page, config.dados[i], i + 1);
    await expect(linhaResolucao(page, criada.descricao)).toHaveCount(1);
  }
});
