import path from 'node:path';
import { test } from '@playwright/test';
import { criarUnidadeDeMedida } from '../../../../../src/actions';
import { loginSge } from '../../../../../src/helpers';
import { lerJsonObjeto, quantidadeConfigurada, textoOpcional } from '../../../../../src/helpers/config-json.helper';

test.describe('Configurações > Definições Iniciais > Itens > Unidades de Medida', () => {
  test('cria unidades de medida', async ({ page }) => {
    const config = lerJsonObjeto(path.resolve(__dirname, 'dados_unidade_de_medida.json'));
    const quantidade = quantidadeConfigurada(config);
    const opcoes = {
      tipo: textoOpcional(config, 'tipo'),
      descricao: textoOpcional(config, 'descricao'),
      abreviacao: textoOpcional(config, 'abreviacao'),
    };
    test.setTimeout(Math.max(120000, quantidade * 60000));

    await loginSge(page);
    for (let sequencia = 1; sequencia <= quantidade; sequencia++) {
      await criarUnidadeDeMedida(page, opcoes, sequencia);
    }
  });
});
