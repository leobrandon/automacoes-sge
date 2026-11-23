import { expect, test } from '@playwright/test';
import { criarCategoriaDaTurma, excluirCategoriaDaTurma } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';

test.describe('Cadastro > Categoria da Turma', () => {
  test('cria, consulta e remove a categoria criada pela execução', async ({ page }) => {
    let descricaoCriada: string | undefined;

    await loginSge(page);

    try {
      const categoria = await criarCategoriaDaTurma(page);
      descricaoCriada = categoria.descricao;
      await expect(page.getByText(categoria.descricao, { exact: true })).toBeVisible();
    } finally {
      if (descricaoCriada) {
        await excluirCategoriaDaTurma(page, descricaoCriada);
      }
    }
  });
});
