import { test } from '@playwright/test';
import { excluirProjetoPedagogico } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { selecionarUnidadeProjeto } from '../../../src/helpers/navigation/projeto-acao-pedagogica.navigation';
import {
  configProjeto,
  idProjetoParaExcluir,
  opcoesLoginProjeto,
} from './projeto_acao_pedagogica_config';
test('exclui o projeto identificado criado pela execução anterior', async ({ page }) => {
  test.setTimeout(180000);
  const d = configProjeto(),
    id = idProjetoParaExcluir();
  await loginSge(page, opcoesLoginProjeto());
  await selecionarUnidadeProjeto(page, d);
  await excluirProjetoPedagogico(page, d, id);
});
