import {test} from '@playwright/test';
import {excluirNotaFiscal} from '../../../../src/actions/excluir-nota-fiscal.action';
import {loginSge} from '../../../../src/helpers';
import {lerConfiguracaoExclusaoNotaFiscal} from './nota_fiscal_config';

test('Excluir somente a Nota Fiscal QAAUTO informada da execução', async ({page}) => {
  test.setTimeout(120000);
  const nota = lerConfiguracaoExclusaoNotaFiscal();
  await loginSge(page);
  await excluirNotaFiscal(page, nota);
});
