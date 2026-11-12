import { expect, test } from '@playwright/test';
import { inativarMotivoConcessao, inativarMotivosConcessaoEmLote } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoInativacaoMotivoConcessao } from './motivo_concessao_config';

// Modo: REGRESSÃO AUTOMATIZADA. Motivos não são excluídos; a inativação exige identificação exata no JSON.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Inativação configurável de Motivos de Concessão', () => {
  test('inativa somente o Motivo QAAUTO identificado no JSON (ou todos, se explicitado)', async ({ page }) => {
    const configuracao = lerConfiguracaoInativacaoMotivoConcessao();
    test.setTimeout(configuracao.inativarTodosQAAUTO ? 600000 : 120000);
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    if (configuracao.inativarTodosQAAUTO) {
      const resultado = await inativarMotivosConcessaoEmLote(page, configuracao.termoGeral);
      expect(resultado.totalInativados).toBe(resultado.titulosInativados.length);
      expect(resultado.titulosInativados.every((titulo) => /^QAAUTO\b/i.test(titulo))).toBe(true);
      expect(resultado.falhas).toEqual([]);
      console.log(`✅ Motivos de Concessão QAAUTO inativados pela interface: ${resultado.totalInativados}`);
      return;
    }

    const inativado = await inativarMotivoConcessao(page, configuracao.titulo);
    expect(inativado.titulo).toBe(configuracao.titulo);
    expect(new URL(inativado.url).origin).toBe(new URL(BASE_URL).origin);
  });
});
