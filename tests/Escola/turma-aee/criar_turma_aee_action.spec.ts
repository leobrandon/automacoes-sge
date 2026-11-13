import { expect, test } from '@playwright/test';
import { criarTurmaAee } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';
import { linhaTurmaAee } from '../../../src/helpers/navigation/turma-aee.navigation';
import { lerConfiguracaoCriacaoTurmaAee } from './turma_aee_config';

const BASE_URL = process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br';

test.describe('Escola > Turma > AEE', () => {
  test('cria e mantém a quantidade configurada para conferência', async ({ page }) => {
    const configuracao = lerConfiguracaoCriacaoTurmaAee();
    test.setTimeout(Math.max(180000, configuracao.quantidade * 120000));
    await loginSge(page, { baseUrl: BASE_URL, timeout: 60000 });

    for (let sequencia = 1; sequencia <= configuracao.quantidade; sequencia++) {
      const dados = {
        ...configuracao.dados,
        descricao: `${configuracao.dados.descricao || 'QAAUTO Turma AEE'} Criacao`,
      };
      const turma = await criarTurmaAee(page, dados, sequencia);
      expect(turma.descricao).toMatch(/^QAAUTO\b/i);
      expect(turma.descricao).toMatch(new RegExp(` ${sequencia}$`));
      expect(turma.horarioEntradaPersistido).toMatch(/^\d{2}:\d{2}$/);
      expect(turma.horarioSaidaPersistido).toMatch(/^\d{2}:\d{2}$/);
      expect(new URL(turma.url).origin).toBe(new URL(BASE_URL).origin);
      await expect(linhaTurmaAee(page, turma.descricao)).toHaveCount(1);
    }
  });
});
