import path from 'node:path';
import { test } from '@playwright/test';
import { criarTipoDeCategoria } from '../../../../../src/actions';
import { loginSge } from '../../../../../src/helpers';
import { lerJsonObjeto, quantidadeConfigurada, textoOpcional } from '../../../../../src/helpers/config-json.helper';

test.describe('Configurações > Definições Iniciais > Itens > Tipo de Categoria', () => {
  test('cria tipos de categoria', async ({ page }) => {
    const config = lerJsonObjeto(path.resolve(__dirname, 'dados_tipo_de_categoria.json'));
    const quantidade = quantidadeConfigurada(config);
    const opcoes = { descricao: textoOpcional(config, 'descricao') };
    test.setTimeout(Math.max(120000, quantidade * 60000));

    await loginSge(page);
    for (let sequencia = 1; sequencia <= quantidade; sequencia++) {
      await criarTipoDeCategoria(page, opcoes, sequencia);
    }
  });
});
