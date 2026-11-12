import { test } from '@playwright/test';
import { excluirGrupoAnosEscolares } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { configExclusaoGrupoAnos } from './grupo_anos_escolares_config';
test('exclui grupo de anos escolares QAAUTO exato', async ({ page }) => {
  const nome = configExclusaoGrupoAnos();
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  await excluirGrupoAnosEscolares(page, nome);
});
