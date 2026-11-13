import { expect, test } from '@playwright/test';
import { criarTurmaDiversificada } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaTurmaDiversificada } from '../../../../src/helpers/navigation/turma-diversificada.navigation';
import { lerConfiguracaoCriacaoTurmaDiversificada } from './turma_diversificada_config';

// Modo: REGRESSÃO AUTOMATIZADA. Cria e mantém as turmas para conferência (a exclusão é outra spec).
const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Escola > Turma > Diversificada', () => {
  test('cria e mantém a quantidade configurada para conferência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoTurmaDiversificada();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const dados = {
        ...configuracao.dados,
        descricao: `${configuracao.dados.descricao || 'QAAUTO Turma Diversificada'} Criacao`,
      };
      const turma = await criarTurmaDiversificada(page, dados, sequencia);
      expect(turma.descricao).toMatch(/^QAAUTO\b/i);
      // Turmas de execuções anteriores continuam no ambiente: a sequência avança até achar uma descrição livre.
      expect(Number(/ (\d+)$/.exec(turma.descricao)?.[1])).toBeGreaterThanOrEqual(sequencia);
      expect(turma.horarioEntradaPersistido).toMatch(/^\d{2}:\d{2}$/);
      expect(turma.horarioSaidaPersistido).toMatch(/^\d{2}:\d{2}$/);
      expect(new URL(turma.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaTurmaDiversificada(page, turma.descricao)).toHaveCount(1);
    }
  });
});
