import { expect, test } from '@playwright/test';
import { limparEscalasQAAuto } from '../../../../src/actions/limpar-escalas-qaauto.action';
import { loginSge } from '../../../../src/helpers';
import { lerDadosLimpezaEscala } from './escala-test-config';

test('exclui todas as Escalas QAAUTO que correspondem ao termo configurado', async ({ page }) => {
  const dados = lerDadosLimpezaEscala();
  expect(dados.excluirTodasQAAUTO, 'Defina excluirTodasQAAUTO: true em dados_limpeza_escala.json para esta limpeza.')
    .toBe(true);

  await loginSge(page);
  const excluidas = await limparEscalasQAAuto(page, dados.termoBusca ?? '');
  console.log(`[QAAUTO] Escalas removidas: ${excluidas.join(' | ') || 'nenhuma'}`);
});
