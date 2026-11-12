import {test} from '@playwright/test';
import {criarNotaFiscal} from '../../../../src/actions/criar-nota-fiscal.action';
import {loginSge} from '../../../../src/helpers';
import {lerConfiguracaoCriacaoNotaFiscal} from './nota_fiscal_config';

test('Criar Nota Fiscal QAAUTO e preservar para exclusão isolada', async ({page}) => {
  const {quantidade, opcoes} = lerConfiguracaoCriacaoNotaFiscal();
  test.setTimeout(Math.max(180000, quantidade * 120000));
  await loginSge(page);
  for (let i = 1; i <= quantidade; i++) await criarNotaFiscal(page, opcoes, i);
});
