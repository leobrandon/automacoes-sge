import { expect, test } from '@playwright/test';
import { criarVigenciaConselhoEscolar } from '../../../../src/actions';
import { buildConselhoEscolar } from '../../../../src/factories/conselho-escolar.factory';
import { loginSge } from '../../../../src/helpers';
import { entrarNaUnidadeEscolar, linhaVigencia } from '../../../../src/helpers/navigation/conselho-escolar.navigation';
import { lerConfiguracaoCriacaoConselhoEscolar } from './conselho_escolar_config';

// Modo: REGRESSÃO AUTOMATIZADA. As vigências criadas permanecem para conferência (visão Unidade Escolar).
// Uma nova execução exige antes excluir_conselho_escolar_action.spec.ts (datas não podem se sobrepor).
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Escola > Conselho Escolar > Conselho', () => {
  test('cria as vigências configuradas com membros e anexos e mantém para conferência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoConselhoEscolar();
    test.setTimeout(Math.max(240000, configuracao.vigencias.length * 150000));
    await loginSge(page, { baseUrl: BASE_URL });
    await entrarNaUnidadeEscolar(page, configuracao.escola);

    for (const vigencia of buildConselhoEscolar(configuracao.vigencias)) {
      const criada = await criarVigenciaConselhoEscolar(page, vigencia);
      expect(new URL(criada.url).origin).toBe(new URL(BASE_URL).origin);
      expect(criada.membros).toHaveLength(vigencia.membros.length);
      expect(criada.anexos).toHaveLength(vigencia.anexos.length);
      await expect(linhaVigencia(page, vigencia.dataInicio, vigencia.dataFim)).toHaveCount(1);
      console.log(`✅ Vigência ${vigencia.dataInicio} a ${vigencia.dataFim} mantida (membros: ${criada.membros.join('; ')})`);
    }
  });
});
