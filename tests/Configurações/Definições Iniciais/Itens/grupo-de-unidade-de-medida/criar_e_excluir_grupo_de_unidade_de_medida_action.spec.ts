import path from 'node:path';
import { test } from '@playwright/test';
import { criarGrupoDeUnidadeDeMedida, excluirGrupoDeUnidadeDeMedida } from '../../../../../src/actions';
import { loginSge } from '../../../../../src/helpers';
import { lerJsonObjeto, textoOpcional } from '../../../../../src/helpers/config-json.helper';

test.describe('Configurações > Definições Iniciais > Itens > Grupos de Unidade de Medida', () => {
  test('cria, consulta e remove o grupo criado pela execução', async ({ page }) => {
    const config = lerJsonObjeto(path.resolve(__dirname, 'dados_grupo_de_unidade_de_medida.json'));
    const opcoes = {
      descricao: textoOpcional(config, 'descricao'),
      unidadeDeMedida: textoOpcional(config, 'unidadeDeMedida'),
    };
    let descricaoCriada: string | undefined;

    await loginSge(page);
    try {
      descricaoCriada = (await criarGrupoDeUnidadeDeMedida(page, opcoes)).descricao;
    } finally {
      if (descricaoCriada) await excluirGrupoDeUnidadeDeMedida(page, descricaoCriada);
    }
  });
});
