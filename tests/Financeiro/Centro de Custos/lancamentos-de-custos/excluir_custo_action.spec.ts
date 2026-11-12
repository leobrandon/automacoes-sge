import {expect, test} from '@playwright/test';
import {excluirCusto, excluirCustosQAAutoEmLote} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configExclusaoCusto} from './custo_config';

test('exclui o lançamento de custo QAAUTO informado (ou todos, se explicitado)', async ({page}) => {
  const config = configExclusaoCusto();
  test.setTimeout(config.excluirTodasQAAUTO ? 600000 : 120000);
  await loginSge(page, {baseUrl: process.env.BASE_URL, timeout: 60000});
  if (config.excluirTodasQAAUTO) {
    const r = await excluirCustosQAAutoEmLote(page);
    expect(r.falhas).toEqual([]);
    console.log(`Lançamentos de Custo QAAUTO excluídos: ${r.excluidos.length}`);
    return;
  }
  await excluirCusto(page, config.descricao);
});
