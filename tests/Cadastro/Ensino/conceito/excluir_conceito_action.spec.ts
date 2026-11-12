import { expect, test } from '@playwright/test';
import { excluirConceito, excluirConceitosQAAutoEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoExclusaoConceito } from './conceito_config';

// Modo: REGRESSÃO AUTOMATIZADA. Exclusão exata ou lote explicitamente configurado no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Conceito', () => {
  test('exclui pela interface somente o Conceito QAAUTO identificado no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoConceito();
    await loginSge(page, { baseUrl: BASE_URL });

    if (configuracao.excluirTodasQAAUTO) {
      console.log('🗑️ Iniciando exclusão em lote de Conceitos com prefixo QAAUTO.');
      const resultado = await excluirConceitosQAAutoEmLote(page, configuracao.termoGeral);
      console.log(`✅ Exclusão em lote concluída: ${resultado.totalExcluidos}/${resultado.totalEncontrados}.`);
      expect(resultado.falhas, JSON.stringify(resultado.falhas)).toEqual([]);
      expect(resultado.totalExcluidos).toBe(resultado.totalEncontrados);
      expect(new URL(page.url()).origin).toBe(new URL(BASE_URL).origin);
      return;
    }

    console.log(`🗑️ Iniciando exclusão do Conceito QAAUTO: ${configuracao.descricao}`);
    const excluido = await excluirConceito(page, configuracao.descricao);
    expect(excluido.descricao).toBe(configuracao.descricao);
    expect(new URL(excluido.url).origin).toBe(new URL(BASE_URL).origin);
    console.log(`✅ Conceito QAAUTO excluído: ${excluido.descricao}`);
  });
});
