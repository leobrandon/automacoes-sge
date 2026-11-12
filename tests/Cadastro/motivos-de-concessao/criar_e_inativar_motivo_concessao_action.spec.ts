import { expect, test } from '@playwright/test';
import { criarMotivoConcessao, inativarMotivoConcessao } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaMotivoConcessao } from '../../../src/helpers/navigation/motivo-concessao.navigation';
import { lerConfiguracaoCriacaoMotivoConcessao } from './motivo_concessao_config';

// Modo: REGRESSÃO AUTOMATIZADA. Sem exclusão no SGE, o ciclo termina inativando só o que a execução criou.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Motivos de Concessão', () => {
  test('cria, consulta e inativa somente os Motivos criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoMotivoConcessao();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const motivo = await criarMotivoConcessao(page, configuracao.dados, sequencia);
        criados.push(motivo.titulo);
        await expect(linhaMotivoConcessao(page, motivo.titulo)).toHaveCount(1);
        console.log(`✅ Motivo de Concessão criado e consultado: ${motivo.titulo}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const titulo of criados.reverse()) {
        try {
          const inativado = await inativarMotivoConcessao(page, titulo);
          if (inativado.titulo !== titulo) {
            throw new Error(`A ação retornou "${inativado.titulo}" ao inativar "${titulo}".`);
          }
          console.log(`🧹 Motivo de Concessão criado nesta execução inativado: ${titulo}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao inativar um ou mais Motivos de Concessão desta execução.');
      }
    }
  });
});
