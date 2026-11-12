import { test } from '@playwright/test';
import { criarGrupoAnosEscolares } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { configGrupoAnos } from './grupo_anos_escolares_config';
test('cria e mantém grupo de anos escolares', async ({ page }) => {
  const c = configGrupoAnos();
  test.setTimeout(Math.max(180000, c.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  await criarGrupoAnosEscolares(page, c.dados, 1);
});
