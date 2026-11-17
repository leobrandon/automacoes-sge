import { test } from '@playwright/test';
import { excluirPlanejamentoEscola, excluirPlanejamentosEscolaQAAuto } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { entrarNaVisaoUnidadeEscolar } from '../../../src/helpers/navigation/planejamento-escola.navigation';
import { lerConfiguracaoExclusaoPlanejamentoEscola } from './planejamento_config';

// Modo: REGRESSÃO AUTOMATIZADA. Só exclui planejamentos de tipo QAAUTO: um período específico ou todos da turma.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Exclusão configurável de Planejamento', () => {
  test('exclui planejamentos QAAUTO da turma, em lote ou pelo período informado no JSON', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoPlanejamentoEscola();
    test.setTimeout(300000);
    await loginSge(page, { baseUrl: BASE_URL });
    await entrarNaVisaoUnidadeEscolar(page, configuracao.escola);

    if (configuracao.excluirTodasQAAUTO) {
      const removidos = await excluirPlanejamentosEscolaQAAuto(page, configuracao.filtro);
      console.log(`🧹 Planejamentos QAAUTO excluídos: ${removidos.length} (${removidos.join(', ') || 'nenhum'})`);
      return;
    }

    await excluirPlanejamentoEscola(page, configuracao.filtro, configuracao.periodo);
    console.log(`🧹 Planejamento removido: ${configuracao.periodo}`);
  });
});
