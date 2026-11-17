import { expect, test } from '@playwright/test';
import { cancelarOcorrenciaSaudeColaborador } from '../../../src/actions';
import { loginSge, waitForSgeLoaders } from '../../../src/helpers/navigation/common.navigation';
import { abrirConsultaOcorrenciaSaudeColaborador } from '../../../src/helpers/navigation/ocorrencia-saude-colaborador.navigation';
import { getByRoleSge } from '../../../src/helpers/sge-locators.helper';
import { lerConfiguracaoCancelamentoOcorrenciaSaudeColaborador } from './ocorrencia_saude_colaborador_config';

test('cancela o rascunho QAAUTO configurado', async ({ page }) => {
  const dados = lerConfiguracaoCancelamentoOcorrenciaSaudeColaborador();
  await loginSge(page, { baseUrl: process.env.BASE_URL });
  await test.step('Localizar o rascunho na consulta', async () => {
    await abrirConsultaOcorrenciaSaudeColaborador(page);
    const main = page.locator('#main');
    await main.locator('#searchTerm').fill(dados.colaborador);
    await main.locator('#btn-search').click();
    await waitForSgeLoaders(page);

    const celula = (name: string) => getByRoleSge(page, 'cell', { name, exact: true });
    const linha = main.locator('table tbody tr:visible')
      .filter({ has: celula(dados.escola) })
      .filter({ has: celula(dados.colaborador) })
      .filter({ has: page.locator('td:nth-child(6)').and(celula(dados.dataInicio)) })
      .filter({ has: celula('Rascunho') });
    await expect(linha, 'A consulta deve exibir um único rascunho para a escola, o colaborador e a data inicial.').toHaveCount(1);
    await getByRoleSge(linha, 'cell', { name: dados.colaborador, exact: true }).click();
  });
  await test.step('Conferir o ID e cancelar o rascunho', () =>
    cancelarOcorrenciaSaudeColaborador(page, dados.idOcorrencia, dados.motivoCancelamento),
  );
});
