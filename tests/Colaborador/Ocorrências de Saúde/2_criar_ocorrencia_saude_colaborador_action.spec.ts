import { test } from '@playwright/test';
import { criarOcorrenciaSaudeColaborador } from '../../../src/actions';
import { loginSge } from '../../../src/helpers/navigation/common.navigation';
import { lerConfiguracaoOcorrenciaSaudeColaborador } from './ocorrencia_saude_colaborador_config';

test('cadastra e mantém a ocorrência de saúde em rascunho', async ({ page }) => {
  const dados = lerConfiguracaoOcorrenciaSaudeColaborador();
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  await test.step('Cadastrar e conferir o rascunho', () => criarOcorrenciaSaudeColaborador(page, dados, (idOcorrencia) => {
    const alvo = JSON.stringify({ idOcorrencia, dataInicio: dados.dataInicio });
    console.log('Dados para a spec de cancelamento:', alvo);
  }));
});
