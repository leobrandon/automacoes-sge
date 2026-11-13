import { expect, test } from '@playwright/test';
import { concluirAcompanhamento, criarAcompanhamento } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { lerConfiguracaoCriacaoAcompanhamento } from './acompanhamento_config';

// Modo: REGRESSÃO AUTOMATIZADA (visão Secretaria). O SGE não exclui acompanhamento; o ciclo termina concluindo
// o registro desta execução (irreversível). Não cria dados de apoio: usa o Tipo de pauta do JSON ou uma pauta QAAUTO
// que já exista (com itens e combinação livre); se não houver, falha pedindo criar_tipo_pauta_action.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Acompanhamento', () => {
  test('cria, lança a pontuação e conclui o acompanhamento desta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAcompanhamento();
    test.setTimeout(Math.max(300000, configuracao.quantidade * 180000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let indice = 1; indice <= configuracao.quantidade; indice++) {
      const criado = await criarAcompanhamento(page, configuracao.dados);
      const concluido = await concluirAcompanhamento(page, criado);
      expect(concluido.tipoPauta).toBe(criado.tipoPauta);
      expect(concluido.escola).toBe(criado.escola);
      expect(concluido.periodo).toBe(criado.periodo);
      expect(new URL(concluido.url).origin).toBe(new URL(BASE_URL).origin);
      console.log(`✅ Acompanhamento ${indice}/${configuracao.quantidade} criado e concluído: protocolo ${criado.protocolo}`);
    }
  });
});
