import { test } from '@playwright/test';
import { criarPlanejamentoEscola, excluirPlanejamentoEscola, filtroPlanejamentoEscola } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { entrarNaVisaoUnidadeEscolar } from '../../../src/helpers/navigation/planejamento-escola.navigation';
import { lerConfiguracaoCriacaoPlanejamentoEscola } from './planejamento_config';

// Modo: REGRESSÃO AUTOMATIZADA. Por padrão a execução exclui o que criou (não consome períodos da turma);
// defina "manterParaConferencia": true no JSON para deixar a massa na base.
// Pré-condição do tenant: turma e tipo de planejamento do JSON existem e há período livre na turma.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Escola > Planejamento', () => {
  test('cria os planejamentos configurados pela Unidade Escolar', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoPlanejamentoEscola();
    test.setTimeout(Math.max(240000, configuracao.quantidade * 150000));
    await loginSge(page, { baseUrl: BASE_URL });
    await entrarNaVisaoUnidadeEscolar(page, configuracao.escola);

    const criados: string[] = [];
    const falhas: Error[] = [];
    try {
      for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
        // O período é registrado assim que o salvamento confirma: uma falha na conferência não deixa resíduo.
        const criado = await criarPlanejamentoEscola(page, configuracao.dados, {
          aoSalvar: ({ periodo }) => criados.push(periodo),
        });
        const destino = configuracao.manterParaConferencia ? 'mantido para conferência' : 'será removido pela limpeza';
        console.log(`✅ Planejamento criado e conferido: ${criado.periodo} (${configuracao.dados.turma}) - ${destino}`);
      }
    } catch (erro) {
      falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
    } finally {
      if (!configuracao.manterParaConferencia) {
        const filtro = filtroPlanejamentoEscola(configuracao.dados);
        for (const periodo of criados.reverse()) {
          try {
            await excluirPlanejamentoEscola(page, filtro, periodo);
            console.log(`🧹 Planejamento criado nesta execução removido: ${periodo}`);
          } catch (erro) {
            falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
          }
        }
      }
      if (falhas.length > 0) {
        throw new AggregateError(falhas, 'Falha na criação de Planejamento (ou na limpeza).');
      }
    }
  });
});
