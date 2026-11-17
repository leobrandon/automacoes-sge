import { expect, test } from '@playwright/test';
import { criarOcorrenciaEscolar, excluirOcorrenciaEscolar, validarRecusasOcorrenciaEscolar } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { entrarNaUnidadeEscolar } from '../../../../src/helpers/navigation/conselho-escolar.navigation';
import { linhaOcorrencia, navegarParaOcorrenciaEscolar } from '../../../../src/helpers/navigation/ocorrencia-escolar.navigation';
import { lerConfiguracaoCriacaoOcorrenciaEscolar } from './ocorrencia_escolar_config';

// Modo: REGRESSÃO AUTOMATIZADA. A limpeza remove apenas as ocorrências criadas nesta execução.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Ciclo completo de Ocorrência Escolar', () => {
  test('confere a recusa, cria, consulta e exclui somente as ocorrências criadas nesta execução', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoOcorrenciaEscolar();
    test.setTimeout(Math.max(300000, configuracao.quantidade * 150000));
    await loginSge(page, { baseUrl: BASE_URL });
    await entrarNaUnidadeEscolar(page, configuracao.escola);

    const criadas: string[] = [];
    const falhas: Error[] = [];
    try {
      await validarRecusasOcorrenciaEscolar(page, configuracao.dados);
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        const criada = await criarOcorrenciaEscolar(page, configuracao.dados, sequencia);
        criadas.push(criada.numero);
        await navegarParaOcorrenciaEscolar(page);
        await expect(linhaOcorrencia(page, criada.numero)).toHaveCount(1);
        console.log(`✅ Ocorrência criada e consultada: ${criada.numero} (${criada.descricao})`);
      }
    } catch (erro) {
      falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
    } finally {
      for (const numero of criadas.reverse()) {
        try {
          await excluirOcorrenciaEscolar(page, numero);
          console.log(`🧹 Ocorrência criada nesta execução removida: ${numero}`);
        } catch (erro) {
          falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
        }
      }
      if (falhas.length > 0) {
        throw new AggregateError(falhas, 'Falha no ciclo de Ocorrência Escolar (recusa, criação ou limpeza).');
      }
    }
  });
});
