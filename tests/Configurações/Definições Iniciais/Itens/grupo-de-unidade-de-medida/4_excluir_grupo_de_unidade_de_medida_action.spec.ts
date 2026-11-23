import path from 'node:path';
import { expect, test } from '@playwright/test';
import { excluirGrupoDeUnidadeDeMedida, excluirGruposDeUnidadeDeMedidaEmLote } from '../../../../../src/actions';
import { loginSge } from '../../../../../src/helpers';
import { lerConfiguracaoExclusao } from '../../../../../src/helpers/config-json.helper';

test.describe('Exclusão de Grupos de Unidade de Medida', () => {
  test('exclui os grupos definidos no JSON pela interface do SGE', async ({ page }) => {
    const config = lerConfiguracaoExclusao(path.resolve(__dirname, 'dados_exclusao_grupo_de_unidade_de_medida.json'));
    test.setTimeout(600000);
    await loginSge(page);

    if (config.excluirTodasQAAUTO) {
      const resultado = await excluirGruposDeUnidadeDeMedidaEmLote(page, config.termoGeral);
      expect(resultado.excluidos.every((descricao) => /QAAUTO/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
    } else {
      const resultado = await excluirGrupoDeUnidadeDeMedida(page, config.descricao);
      expect(resultado.descricao).toBe(config.descricao);
    }
  });
});
