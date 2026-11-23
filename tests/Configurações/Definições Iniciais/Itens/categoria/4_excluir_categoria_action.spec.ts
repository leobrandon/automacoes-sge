import path from 'node:path';
import { expect, test } from '@playwright/test';
import { excluirCategoria, excluirCategoriasEmLote } from '../../../../../src/actions';
import { loginSge } from '../../../../../src/helpers';
import { lerConfiguracaoExclusao } from '../../../../../src/helpers/config-json.helper';

test.describe('Exclusão de Categorias', () => {
  test('exclui as categorias definidas no JSON pela interface do SGE', async ({ page }) => {
    const config = lerConfiguracaoExclusao(path.resolve(__dirname, 'dados_exclusao_categoria.json'));
    test.setTimeout(600000);
    await loginSge(page);

    if (config.excluirTodasQAAUTO) {
      const resultado = await excluirCategoriasEmLote(page, config.termoGeral);
      expect(resultado.excluidos.every((nome) => /QAAUTO/i.test(nome))).toBe(true);
      expect(resultado.falhas).toEqual([]);
    } else {
      const resultado = await excluirCategoria(page, config.descricao);
      expect(resultado.nome).toBe(config.descricao);
    }
  });
});
