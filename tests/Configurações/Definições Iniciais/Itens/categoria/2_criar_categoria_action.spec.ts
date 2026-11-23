import path from 'node:path';
import { test } from '@playwright/test';
import { criarCategoria } from '../../../../../src/actions';
import { loginSge } from '../../../../../src/helpers';
import { lerJsonObjeto, quantidadeConfigurada, textoOpcional } from '../../../../../src/helpers/config-json.helper';

test.describe('Configurações > Definições Iniciais > Itens > Categoria', () => {
  test('cria categorias com uma subcategoria', async ({ page }) => {
    const config = lerJsonObjeto(path.resolve(__dirname, 'dados_categoria.json'));
    const quantidade = quantidadeConfigurada(config);
    const opcoes = {
      nome: textoOpcional(config, 'nome'),
      tipoDeCategoria: textoOpcional(config, 'tipoDeCategoria'),
      subcategoria: textoOpcional(config, 'subcategoria'),
    };
    test.setTimeout(Math.max(120000, quantidade * 90000));

    await loginSge(page);
    for (let sequencia = 1; sequencia <= quantidade; sequencia++) {
      await criarCategoria(page, opcoes, sequencia);
    }
  });
});
