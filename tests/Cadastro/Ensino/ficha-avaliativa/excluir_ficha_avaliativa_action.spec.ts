import { expect, test } from '@playwright/test';
import { criarFichaAvaliativa } from '../../../../src/actions/criar-ficha-avaliativa.action';
import {
  excluirFichaAvaliativa,
  excluirFichaAvaliativaQAAuto,
  excluirFichasAvaliativasQAAuto,
} from '../../../../src/actions/excluir-ficha-avaliativa.action';
import { loginSge } from '../../../../src/helpers';
import { linhaFichaAvaliativa } from '../../../../src/helpers/navigation/ficha-avaliativa.navigation';
import {
  lerConfiguracaoCriacaoFichaAvaliativa,
  lerConfiguracaoExclusaoFichaAvaliativa,
} from './ficha_avaliativa_config';

test('exclui ficha QAAUTO e dependências conforme dados_exclusao_ficha_avaliativa.json', async ({ page }) => {
  const baseUrl = process.env.BASE_URL || 'https://sandbox.pontoid.com.br';
  const exclusao = lerConfiguracaoExclusaoFichaAvaliativa();
  const criacao = exclusao.excluirTodasQAAUTO || exclusao.descricao
    ? undefined : lerConfiguracaoCriacaoFichaAvaliativa();
  // O modo em lote percorre páginas e confirma separadamente cada dependência de cada ficha.
  test.setTimeout(exclusao.excluirTodasQAAUTO ? 1200000 : Math.max(300000, (criacao?.quantidade ?? 1) * 240000));
  await loginSge(page, { baseUrl });

  if (exclusao.excluirTodasQAAUTO) {
    const resultado = await excluirFichasAvaliativasQAAuto(page, exclusao.termoGeral);
    expect(resultado.totalEncontrados, 'A busca deve localizar as fichas antes de considerar a exclusão concluída.').toBeGreaterThan(0);
    expect(resultado.falhas, JSON.stringify(resultado.falhas)).toEqual([]);
    expect(resultado.totalExcluidos).toBe(resultado.totalEncontrados);
    expect(resultado.excluidos.every(nome => /^QAAUTO\b/i.test(nome))).toBe(true);
    console.log(`✅ ${resultado.totalExcluidos}/${resultado.totalEncontrados} fichas QAAUTO excluídas.`);
    return;
  }
  if (exclusao.descricao) {
    const excluida = await excluirFichaAvaliativaQAAuto(page, exclusao.descricao);
    expect(excluida.descricao).toBe(exclusao.descricao);
    return;
  }
  if (!criacao) throw new Error('A configuração de criação da ficha está ausente.');
  for (let sequencia = 1; sequencia <= criacao.quantidade; sequencia++) {
    const criada = await criarFichaAvaliativa(page, criacao.dados, sequencia);
    await expect(linhaFichaAvaliativa(page, criada.descricao)).toHaveCount(1);
    const excluida = await excluirFichaAvaliativa(page, criada);
    expect(excluida.descricao).toBe(criada.descricao);
    await expect(linhaFichaAvaliativa(page, criada.descricao)).toHaveCount(0);
  }
});
