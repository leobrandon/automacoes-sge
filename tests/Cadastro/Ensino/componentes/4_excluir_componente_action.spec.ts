import { expect, test } from '@playwright/test';
import { excluirComponente, excluirComponentesEmLote } from '../../../../src/actions';
import { isComponenteQAAuto } from '../../../../src/factories/componente.factory';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoComponente } from './componentes_config';

const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão de Componentes', () => {
  test('exclui os Componentes definidos no JSON pela interface do SGE', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoComponente();
    test.setTimeout(600000);
    await loginSge(page, { baseUrl: BASE_URL });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirComponentesEmLote(page, configuracao.termoGeral);
      expect(resultado.totalEncontrados).toBe(
        resultado.totalExcluidos + resultado.falhas.length,
      );
      expect(resultado.componentesExcluidos.every(isComponenteQAAuto)).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(
        `✅ Componentes QAAUTO encontrados: ${resultado.totalEncontrados}; excluídos: ${resultado.totalExcluidos}`,
      );
      return;
    }

    const resultado = await excluirComponente(page, configuracao.nome);
    expect(resultado.nome).toBe(configuracao.nome);
    expect(new URL(resultado.url).origin).toBe(new URL(BASE_URL).origin);
    console.log(`✅ Componente excluído: ${resultado.nome}`);
  });
});
