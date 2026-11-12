import { test } from '@playwright/test';
import { criarProjetoPedagogico } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { selecionarUnidadeProjeto } from '../../../src/helpers/navigation/projeto-acao-pedagogica.navigation';
import { configProjeto, opcoesLoginProjeto } from './projeto_acao_pedagogica_config';
test('cria e mantém projeto da escola e período configurados', async ({ page }) => {
  test.setTimeout(180000);
  const d = configProjeto();
  await loginSge(page, opcoesLoginProjeto());
  await selecionarUnidadeProjeto(page, d);
  const id = await criarProjetoPedagogico(page, d);
  console.log(`ID do projeto criado nesta execução: ${id}`);
});
