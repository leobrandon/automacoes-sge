import path from 'node:path';
import { test } from '@playwright/test';
import { criarTipoDeCategoria, excluirTipoDeCategoria } from '../../../../../src/actions';
import { loginSge } from '../../../../../src/helpers';
import { lerJsonObjeto, textoOpcional } from '../../../../../src/helpers/config-json.helper';

test.describe('Configurações > Definições Iniciais > Itens > Tipo de Categoria', () => {
  test('cria, consulta e remove o tipo criado pela execução', async ({ page }) => {
    const config = lerJsonObjeto(path.resolve(__dirname, 'dados_tipo_de_categoria.json'));
    const opcoes = { descricao: textoOpcional(config, 'descricao') };
    let descricaoCriada: string | undefined;

    await loginSge(page);
    try {
      descricaoCriada = (await criarTipoDeCategoria(page, opcoes)).descricao;
    } finally {
      if (descricaoCriada) await excluirTipoDeCategoria(page, descricaoCriada);
    }
  });
});
