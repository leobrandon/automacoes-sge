import {expect, test} from '@playwright/test';
import {excluirReceita, excluirReceitasQAAutoEmLote} from '../../../../src/actions';
import {loginSge} from '../../../../src/helpers';
import {configExclusaoReceita} from './receita_config';

test('exclui o lançamento de receita QAAUTO informado (ou todos, se explicitado)', async ({page}) => {
  const config = configExclusaoReceita();
  test.setTimeout(config.excluirTodasQAAUTO ? 600000 : 120000);
  await loginSge(page, {baseUrl: process.env.BASE_URL, timeout: 60000});
  if (config.excluirTodasQAAUTO) {
    const r = await excluirReceitasQAAutoEmLote(page);
    expect(r.falhas).toEqual([]);
    console.log(`Lançamentos de Receita QAAUTO excluídos: ${r.excluidos.length}`);
    return;
  }
  await excluirReceita(page, config.descricao);
});
