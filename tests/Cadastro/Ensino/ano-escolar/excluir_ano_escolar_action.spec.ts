import { expect, test } from '@playwright/test';
import { excluirAnoEscolar, excluirAnosEscolaresEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { isAnoEscolarQAAuto } from '../../../../src/factories/ano-escolar.factory';
import { lerConfiguracaoExclusaoAnoEscolar } from './ano_escolar_config';

function sandboxUrl(): string {
  const baseUrl = process.env.BASE_URL || 'https://sandbox.pontoid.com.br';
  return baseUrl;
}

test.describe('Exclusão configurável de Ano Escolar', () => {
  test('Exclusão de Ano Escolar', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoAnoEscolar();
    test.skip(
      !configuracao.excluirTodasQAAUTO && !configuracao.nome,
      'Preencha nome com um identificador QAAUTO exato ou habilite excluirTodasQAAUTO no JSON.',
    );
    await loginSge(page, { baseUrl: sandboxUrl() });

    if (configuracao.excluirTodasQAAUTO) {
      const resultado = await excluirAnosEscolaresEmLote(page, configuracao.termoGeral);
      expect(resultado.totalEncontrados).toBe(resultado.totalExcluidos + resultado.falhas.length);
      expect(resultado.nomesExcluidos.every(isAnoEscolarQAAuto)).toBe(true);
      expect(resultado.falhas).toEqual([]);
      return;
    }

    const excluido = await excluirAnoEscolar(page, configuracao.nome);
    expect(excluido.nome).toBe(configuracao.nome);
  });
});
