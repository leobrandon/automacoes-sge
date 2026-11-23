import { expect, test } from '@playwright/test';
import { loginSge } from '../../../../src/helpers';
import { excluirJustificativaFrequencia } from '../../../../src/actions/excluir-justificativa-frequencia.action';
import {
  linhaJustificativaFrequencia,
  pesquisarJustificativaFrequencia,
} from '../../../../src/helpers/navigation/justificativa-frequencia.navigation';
import {
  lerConfiguracaoExclusaoJustificativaFrequencia,
  validarEscopoExclusao,
  validarUrlSandbox,
} from './justificativa_frequencia_config';

test('exclui as Justificativas de Frequência QAAUTO listadas no JSON', async ({ page }) => {
  const configuracao = lerConfiguracaoExclusaoJustificativaFrequencia();
  const baseUrl = validarUrlSandbox(
    process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
  );
  validarEscopoExclusao(configuracao, configuracao.descricoes);

  test.setTimeout(Math.max(120000, configuracao.descricoes.length * 60000));
  await loginSge(page, { baseUrl });

  for (const descricao of configuracao.descricoes) {
    await pesquisarJustificativaFrequencia(page, descricao);
    const linha = linhaJustificativaFrequencia(page, descricao);
    await expect(linha).toHaveCount(1);
    await expect(linha.locator('td').first()).toHaveText(descricao);

    const excluida = await excluirJustificativaFrequencia(page, descricao);
    expect(excluida.descricao).toBe(descricao);
    await pesquisarJustificativaFrequencia(page, descricao);
    await expect(linhaJustificativaFrequencia(page, descricao)).toHaveCount(0);
    console.log(`[QAAUTO] EXCLUÍDA E CONFERIDA: ${descricao}`);
  }

  console.log(`[QAAUTO] Exclusão concluída: ${configuracao.descricoes.length} justificativa(s).`);
});
