import { expect, test } from '@playwright/test';
import { inativarPermissaoPonto, inativarPermissoesPontoEmLote } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { lerConfiguracaoInativacaoPermissaoPonto } from './permissao_ponto_config';

// Modo: REGRESSÃO AUTOMATIZADA. Permissões não são excluídas; a inativação exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Inativação configurável de Permissões Para Uso do Ponto', () => {
  test('inativa somente a Permissão QAAUTO identificada no JSON (ou todas, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoInativacaoPermissaoPonto();
    test.setTimeout(configuracao.inativarTodasQAAUTO ? 600000 : 120000);
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.inativarTodasQAAUTO) {
      const resultado = await inativarPermissoesPontoEmLote(page, configuracao.termoGeral);
      expect(resultado.totalInativadas).toBe(resultado.descricoesInativadas.length);
      expect(resultado.descricoesInativadas.every((descricao) => /^QAAUTO\b/i.test(descricao))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Permissões QAAUTO inativadas pela interface: ${resultado.totalInativadas}`);
      return;
    }

    const inativada = await inativarPermissaoPonto(page, configuracao.descricao);
    expect(inativada.descricao).toBe(configuracao.descricao);
    expect(new URL(inativada.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
