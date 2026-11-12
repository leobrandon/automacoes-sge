import { expect, test } from '@playwright/test';
import { criarAtividadeFisica, excluirAtividadeFisica } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaAtividadeFisica } from '../../../../src/helpers/navigation/atividade-fisica.navigation';
import { lerConfiguracaoCriacaoAtividadeFisica } from './atividade_fisica_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas os registros desta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Atividades Físicas', () => {
  test('cria, consulta e exclui somente as atividades físicas criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoAtividadeFisica();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL });

    const criadas: string[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const atividade = await criarAtividadeFisica(page, configuracao.dados, sequencia);
        criadas.push(atividade.descricao);
        await expect(linhaAtividadeFisica(page, atividade.descricao)).toHaveCount(1);
        console.log(`✅ Atividade Física criada e consultada: ${atividade.descricao}`);
      }
    } finally {
      const falhasLimpeza: Error[] = [];
      for (const descricao of criadas.reverse()) {
        try {
          const removida = await excluirAtividadeFisica(page, descricao);
          if (removida.descricao !== descricao) {
            throw new Error(`A ação retornou "${removida.descricao}" ao excluir "${descricao}".`);
          }
          console.log(`🧹 Atividade Física criada nesta execução removida: ${descricao}`);
        } catch (erro) {
          falhasLimpeza.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhasLimpeza.length > 0) {
        throw new AggregateError(falhasLimpeza, 'Falha ao remover uma ou mais Atividades Físicas desta execução.');
      }
    }
  });
});
