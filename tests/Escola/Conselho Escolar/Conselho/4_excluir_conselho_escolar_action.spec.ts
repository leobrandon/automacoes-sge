import { expect, test } from '@playwright/test';
import { excluirVigenciaConselhoEscolar } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { entrarNaUnidadeEscolar, linhaVigencia } from '../../../../src/helpers/navigation/conselho-escolar.navigation';
import { lerConfiguracaoExclusaoConselhoEscolar } from './conselho_escolar_config';

// Modo: exclusão individual por datas exatas (a vigência não tem nome, então não há lote).
// Remove anexos e membros da vigência antes; recusa anexo/membro de comunidade que não seja QAAUTO.
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Escola > Conselho Escolar > Conselho (exclusão)', () => {
  test('exclui as vigências informadas pelas datas exatas', async ({ page }) => {
    const configuracao = lerConfiguracaoExclusaoConselhoEscolar();
    test.setTimeout(Math.max(180000, configuracao.vigencias.length * 120000));
    await loginSge(page, { baseUrl: BASE_URL });
    await entrarNaUnidadeEscolar(page, configuracao.escola);

    for (const alvo of configuracao.vigencias) {
      const excluida = await excluirVigenciaConselhoEscolar(page, alvo);
      expect(excluida.dataInicio).toBe(alvo.dataInicio);
      expect(excluida.dataFim).toBe(alvo.dataFim);
      expect(new URL(excluida.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaVigencia(page, alvo.dataInicio, alvo.dataFim)).toHaveCount(0);
      console.log(`🧹 Vigência ${alvo.dataInicio} a ${alvo.dataFim} excluída (membros: ${excluida.membrosRemovidos}, anexos: ${excluida.anexosRemovidos})`);
    }
  });
});
