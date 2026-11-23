import { expect, test } from '@playwright/test';
import { criarAcompanhamento } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaAcompanhamento } from '../../../src/helpers/navigation/acompanhamento.navigation';
import { lerConfiguracaoCriacaoAcompanhamento } from './acompanhamento_config';

// Modo: REGRESSÃO AUTOMATIZADA (visão Secretaria). O SGE não oferece exclusão de acompanhamento pela tela,
// então os registros criados permanecem no ambiente; cada execução usa uma combinação pauta/escola/período livre.
// Não cria dados de apoio: usa o Tipo de pauta do JSON ou uma pauta QAAUTO existente (com itens e combinação livre).
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Acompanhamento/Pautas > Acompanhamentos', () => {
  test('cria o acompanhamento, lança a pontuação e confere a persistência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAcompanhamento();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let indice = 1; indice <= configuracao.quantidade; indice++) {
      const criado = await criarAcompanhamento(page, configuracao.dados);
      expect(criado.tipoPauta).toMatch(/^QAAUTO\b/i);
      expect(new URL(criado.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaAcompanhamento(page, criado.tipoPauta, criado.periodo, criado.escola)).toHaveCount(1);
      console.log(`✅ Acompanhamento ${indice}/${configuracao.quantidade} mantido: protocolo ${criado.protocolo}`);
    }
  });
});
