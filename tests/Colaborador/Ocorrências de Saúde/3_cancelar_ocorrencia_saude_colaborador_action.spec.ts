import { expect, test } from '@playwright/test';
import { cancelarOcorrenciaSaudeColaborador } from '../../../src/actions';
import { loginSge } from '../../../src/helpers/navigation/common.navigation';
import { getByRoleSge } from '../../../src/helpers/sge-locators.helper';
import { lerConfiguracaoCancelamentoOcorrenciaSaudeColaborador } from './ocorrencia_saude_colaborador_config';
import {
  avancarPaginaDeOcorrencias,
  criarECancelarRascunhoDeTeste,
  encontrarDataLivreParaRascunho,
  pesquisarOcorrenciasDoColaborador,
} from './ocorrencia_saude_colaborador_fluxo';

test('cancela o rascunho QAAUTO configurado', async ({ page }) => {
  const dados = lerConfiguracaoCancelamentoOcorrenciaSaudeColaborador();
  test.setTimeout(120000);
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  const { idOcorrencia } = dados;
  if (idOcorrencia === undefined) {
    const dataInicio = await test.step('Encontrar um período livre para o rascunho de teste', () =>
      encontrarDataLivreParaRascunho(page, dados),
    );
    await criarECancelarRascunhoDeTeste(page, { ...dados, dataInicio });
    return;
  }
  await test.step('Localizar o rascunho na consulta', async () => {
    await pesquisarOcorrenciasDoColaborador(page, dados.colaborador);
    const main = page.locator('#main');

    const celula = (name: string) => getByRoleSge(page, 'cell', { name, exact: true });
    const linha = main.locator('table tbody tr:visible')
      .filter({ has: celula(dados.escola) })
      .filter({ has: celula(dados.colaborador) })
      .filter({ has: page.locator('td:nth-child(6)').and(celula(dados.dataInicio)) })
      .filter({ has: celula('Rascunho') });
    while (await linha.count() === 0 && await avancarPaginaDeOcorrencias(page)) {
      // A linha pode estar em uma página posterior da consulta.
    }
    await expect(linha, 'A consulta deve exibir um único rascunho para a escola, o colaborador e a data inicial.').toHaveCount(1);
    await getByRoleSge(linha, 'cell', { name: dados.colaborador, exact: true }).click();
  });
  await test.step('Conferir o ID e cancelar o rascunho', () =>
    cancelarOcorrenciaSaudeColaborador(page, idOcorrencia, dados.motivoCancelamento),
  );
});
