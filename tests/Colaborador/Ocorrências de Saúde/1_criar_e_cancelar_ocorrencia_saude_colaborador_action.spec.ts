import { test } from '@playwright/test';
import { loginSge } from '../../../src/helpers/navigation/common.navigation';
import { lerConfiguracaoOcorrenciaSaudeColaborador } from './ocorrencia_saude_colaborador_config';
import { criarECancelarRascunhoDeTeste } from './ocorrencia_saude_colaborador_fluxo';

test('cria uma ocorrência de saúde em rascunho e cancela somente o registro criado', async ({ page }) => {
  const dados = lerConfiguracaoOcorrenciaSaudeColaborador();
  test.setTimeout(120000);
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  await criarECancelarRascunhoDeTeste(page, dados);
});
