import path from 'node:path';
import { expect, test } from '@playwright/test';
import { excluirTipoDeCategoria, excluirTiposDeCategoriaEmLote } from '../../../../../src/actions';
import { loginSge } from '../../../../../src/helpers';
import { lerConfiguracaoExclusao } from '../../../../../src/helpers/config-json.helper';

test.describe('Exclusão de Tipos de Categoria', () => {
  test('exclui os tipos definidos no JSON pela interface do SGE', async ({ page }) => {
    const config = lerConfiguracaoExclusao(path.resolve(__dirname, 'dados_exclusao_tipo_de_categoria.json'));
    test.setTimeout(600000);
    await loginSge(page);

    if (config.excluirTodasQAAUTO) {
      const resultado = await excluirTiposDeCategoriaEmLote(page, config.termoGeral);
      expect(resultado.excluidos.every((descricao) => /QAAUTO/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
    } else {
      const resultado = await excluirTipoDeCategoria(page, config.descricao);
      expect(resultado.descricao).toBe(config.descricao);
    }
  });
});
