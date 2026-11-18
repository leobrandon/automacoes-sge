import { expect, test } from '@playwright/test';
import { buildJustificativaFrequencia } from '../../../../src/factories/justificativa-frequencia.factory';
import { loginSge } from '../../../../src/helpers';
import { criarJustificativaFrequencia } from '../../../../src/actions/criar-justificativa-frequencia.action';
import {
  linhaJustificativaFrequencia,
  pesquisarJustificativaFrequencia,
} from '../../../../src/helpers/navigation/justificativa-frequencia.navigation';
import {
  lerConfiguracaoCriacaoJustificativaFrequencia,
  validarUrlSandbox,
} from './justificativa_frequencia_config';

test('cria Justificativas de Frequência com Abono Sim e Não', async ({ page }) => {
  const configuracao = lerConfiguracaoCriacaoJustificativaFrequencia();
  const baseUrl = validarUrlSandbox(
    process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
  );
  const planejadas = Array.from({ length: configuracao.quantidade }, (_, indice) =>
    buildJustificativaFrequencia(configuracao.dados, indice + 1));

  test.setTimeout(Math.max(120000, configuracao.quantidade * 60000));
  await loginSge(page, { baseUrl });

  // Não sobrescreve registros que já existiam com os nomes determinísticos do JSON.
  for (const esperada of planejadas) {
    await pesquisarJustificativaFrequencia(page, esperada.descricao);
    await expect(linhaJustificativaFrequencia(page, esperada.descricao)).toHaveCount(0);
  }

  for (let indice = 0; indice < planejadas.length; indice++) {
    const esperada = planejadas[indice];
    const criada = await criarJustificativaFrequencia(page, configuracao.dados, indice + 1);

    expect(criada.descricao).toBe(esperada.descricao);
    expect(criada.abonaFalta).toBe(esperada.abonaFalta);
    await pesquisarJustificativaFrequencia(page, esperada.descricao);
    const linha = linhaJustificativaFrequencia(page, esperada.descricao);
    await expect(linha).toHaveCount(1);
    await expect(linha.locator('td:nth-child(2) i'))
      .toHaveClass(esperada.abonaFalta ? /fa-check/ : /fa-times/);

    console.log(
      `[QAAUTO] CRIADA E CONFERIDA: ${criada.descricao} | Abono: ${esperada.abonaFalta ? 'Sim' : 'Não'}`,
    );
  }

  console.log(`[QAAUTO] Criação concluída: ${planejadas.length} justificativa(s). Execute o spec de exclusão em seguida.`);
});
