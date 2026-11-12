import { expect, test } from '@playwright/test';
import { criarHorario, excluirHorario } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaHorario } from '../../../../src/helpers/navigation/horario.navigation';
import { lerConfiguracaoCriacaoHorario } from './horario_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Horários', () => {
  test('cria, consulta e exclui somente os Horários criados nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoHorario();
    test.setTimeout(Math.max(240000, configuracao.quantidade * 180000));
    // O POST de login levou ~22 s medidos no ambiente; o padrão de 20 s do helper não basta.
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    const criados: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const horario = await criarHorario(page, configuracao.dados, sequencia);
        criados.push(horario.descricao);
        await expect(linhaHorario(page, horario.descricao)).toHaveCount(1);
        console.log(`✅ Horário criado e consultado: ${horario.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criados.reverse()) {
        try {
          const removido = await excluirHorario(page, descricao);
          if (removido.descricao !== descricao) {
            throw new Error(`A ação retornou "${removido.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Horário criado nesta execução removido: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover um ou mais Horários desta execução.');
      }
    }
  });
});
