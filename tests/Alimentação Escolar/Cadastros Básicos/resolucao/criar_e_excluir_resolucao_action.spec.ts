import { expect, test } from '@playwright/test';
import { criarResolucao, excluirResolucao } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';
import { linhaResolucao } from '../../../../src/helpers/navigation/resolucao.navigation';
import { lerConfiguracaoCriacaoResolucao } from './resolucao_config';

test('cria, consulta e exclui as resoluções desta execução', async ({ page }) => {
  const config = lerConfiguracaoCriacaoResolucao();
  test.setTimeout(Math.max(180000, config.quantidade * 120000));
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  const criadas: string[] = [];
  try {
    for (let i = 0; i < config.quantidade; i++) {
      const criada = await criarResolucao(page, config.dados[i], i + 1);
      criadas.push(criada.descricao);
      await expect(linhaResolucao(page, criada.descricao)).toHaveCount(1);
    }
  } finally {
    const falhas: Error[] = [];
    for (const descricao of criadas.reverse()) {
      try {
        const removida = await excluirResolucao(page, descricao);
        expect(removida.descricao).toBe(descricao);
      } catch (erro) {
        falhas.push(erro instanceof Error ? erro : new Error(String(erro)));
      }
    }
    if (falhas.length)
      throw new AggregateError(falhas, 'Falha ao remover resoluções desta execução.');
  }
});
