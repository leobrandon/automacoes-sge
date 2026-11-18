import { expect, test } from '@playwright/test';
import { criarOcorrenciaEscolar } from '../../../../src/actions';
import { linhaOcorrencia, loginNaUnidadeEscolar, navegarParaOcorrenciaEscolar } from '../../../../src/helpers/navigation/ocorrencia-escolar.navigation';
import { lerConfiguracaoCriacaoOcorrenciaEscolar } from './ocorrencia_escolar_config';

// Modo: REGRESSÃO AUTOMATIZADA. As ocorrências criadas permanecem para conferência (visão Unidade Escolar).
// Pré-condição do tenant: o tipo e a natureza do JSON existem e o aluno do JSON está cadastrado.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Escola > Ocorrências > Escolares', () => {
  test('cria as ocorrências configuradas com envolvido e mantém para conferência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoOcorrenciaEscolar();
    test.setTimeout(Math.max(240000, configuracao.quantidade * 150000));
    await loginNaUnidadeEscolar(page, configuracao.escola, BASE_URL);

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const criada = await criarOcorrenciaEscolar(page, configuracao.dados, sequencia);
      await navegarParaOcorrenciaEscolar(page);
      await expect(linhaOcorrencia(page, criada.numero)).toHaveCount(1);
      console.log(`✅ Ocorrência ${criada.numero} criada e mantida: ${criada.descricao}`);
    }
  });
});
