import {expect, test} from '@playwright/test';
import {excluirOrcamento, excluirOrcamentosQAAutoEmLote} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configExclusaoOrcamento} from './orcamento_config';

test('exclui o orçamento QAAUTO informado (ou todos, se explicitado)', async ({page}) => {
  const config = configExclusaoOrcamento();
  test.setTimeout(config.excluirTodasQAAUTO ? 600000 : 120000);
  await loginSge(page, {baseUrl: process.env.BASE_URL, timeout: 60000});
  if (config.excluirTodasQAAUTO) {
    const r = await excluirOrcamentosQAAutoEmLote(page);
    expect(r.falhas).toEqual([]);
    console.log(`Orçamentos QAAUTO excluídos: ${r.excluidos.length}`);
    return;
  }
  await excluirOrcamento(page, config.descricao);
});
