import fs from 'node:fs';
import path from 'node:path';
import { test } from '@playwright/test';
import {
  excluirTodosFornecedoresQAAuto,
  type ConfiguracaoExclusaoGeralFornecedor,
} from '../../../../src/actions/excluir-todos-fornecedores-qaauto.action';
import { loginSge } from '../../../../src/helpers';
import { baseUrlFornecedor } from './fornecedor_pj_config';

// Exclusão geral: só exclui; não cria massa. Remove todos os Fornecedores Pessoa Jurídica QAAUTO.
test('exclui todos os Fornecedores Pessoa Jurídica QAAUTO', async ({ page }) => {
  test.setTimeout(600000);
  const configuracao = JSON.parse(
    fs.readFileSync(path.resolve(__dirname, 'dados_excluir_todos_fornecedor_pj.json'), 'utf-8'),
  ) as ConfiguracaoExclusaoGeralFornecedor;

  await loginSge(page, { baseUrl: baseUrlFornecedor() });
  await excluirTodosFornecedoresQAAuto(page, 'Pessoa Jurídica', configuracao);
});
