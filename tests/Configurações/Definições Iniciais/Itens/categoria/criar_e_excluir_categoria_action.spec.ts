import path from 'node:path';
import { test } from '@playwright/test';
import { criarCategoria, excluirCategoria } from '../../../../../src/actions';
import { loginSge } from '../../../../../src/helpers';
import { lerJsonObjeto, textoOpcional } from '../../../../../src/helpers/config-json.helper';

test.describe('Configurações > Definições Iniciais > Itens > Categoria', () => {
  test('cria categoria com subcategoria, consulta e remove a criada pela execução', async ({ page }) => {
    const config = lerJsonObjeto(path.resolve(__dirname, 'dados_categoria.json'));
    const opcoes = {
      nome: textoOpcional(config, 'nome'),
      tipoDeCategoria: textoOpcional(config, 'tipoDeCategoria'),
      subcategoria: textoOpcional(config, 'subcategoria'),
    };
    let nomeCriado: string | undefined;

    await loginSge(page);
    try {
      nomeCriado = (await criarCategoria(page, opcoes)).nome;
    } finally {
      if (nomeCriado) await excluirCategoria(page, nomeCriado);
    }
  });
});
