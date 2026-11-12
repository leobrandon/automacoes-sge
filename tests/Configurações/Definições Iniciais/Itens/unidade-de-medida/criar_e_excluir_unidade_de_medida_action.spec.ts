import path from 'node:path';
import { test } from '@playwright/test';
import { criarUnidadeDeMedida, excluirUnidadeDeMedida } from '../../../../../src/actions';
import { loginSge } from '../../../../../src/helpers';
import { lerJsonObjeto, textoOpcional } from '../../../../../src/helpers/config-json.helper';

test.describe('Configurações > Definições Iniciais > Itens > Unidades de Medida', () => {
  test('cria, consulta e remove a unidade criada pela execução', async ({ page }) => {
    const config = lerJsonObjeto(path.resolve(__dirname, 'dados_unidade_de_medida.json'));
    const opcoes = {
      tipo: textoOpcional(config, 'tipo'),
      descricao: textoOpcional(config, 'descricao'),
      abreviacao: textoOpcional(config, 'abreviacao'),
    };
    let descricaoCriada: string | undefined;

    await loginSge(page);
    try {
      descricaoCriada = (await criarUnidadeDeMedida(page, opcoes)).descricao;
    } finally {
      if (descricaoCriada) await excluirUnidadeDeMedida(page, descricaoCriada);
    }
  });
});
