import path from 'node:path';
import { test } from '@playwright/test';
import { criarGrupoDeUnidadeDeMedida } from '../../../../../src/actions';
import { loginSge } from '../../../../../src/helpers';
import { lerJsonObjeto, quantidadeConfigurada, textoOpcional } from '../../../../../src/helpers/config-json.helper';

test.describe('Configurações > Definições Iniciais > Itens > Grupos de Unidade de Medida', () => {
  test('cria grupos de unidade de medida', async ({ page }) => {
    const config = lerJsonObjeto(path.resolve(__dirname, 'dados_grupo_de_unidade_de_medida.json'));
    const quantidade = quantidadeConfigurada(config);
    const opcoes = {
      descricao: textoOpcional(config, 'descricao'),
      unidadeDeMedida: textoOpcional(config, 'unidadeDeMedida'),
    };
    test.setTimeout(Math.max(120000, quantidade * 60000));

    await loginSge(page);
    for (let sequencia = 1; sequencia <= quantidade; sequencia++) {
      await criarGrupoDeUnidadeDeMedida(page, opcoes, sequencia);
    }
  });
});
