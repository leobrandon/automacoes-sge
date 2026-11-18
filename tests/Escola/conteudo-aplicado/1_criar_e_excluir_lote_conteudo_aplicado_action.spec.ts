import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { excluirConteudosPorPrefixo, excluirConteudoAplicadoLancamento, lancarConteudoAplicado, type ConteudoAplicadoLancamentoDados } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';

test('exclui todos os registros do termo configurado e preserva os demais', async ({ page }) => {
  test.setTimeout(300000);
  page.setDefaultTimeout(10000);
  const base = JSON.parse(readFileSync(join(__dirname, 'dados_conteudo_aplicado.json'), 'utf8')) as ConteudoAplicadoLancamentoDados;
  const habilitado = { ...base, habilidades: 'QAAUTO LOTE CONTEUDO HABILITADO', objetosConhecimento: 'QAAUTO LOTE CONTEUDO OBJETO' };
  const desabilitado = { ...base, habilidades: 'QAAUTO LOTE CONTEUDO DESABILITADO', objetosConhecimento: 'QAAUTO LOTE CONTEUDO OBJETO' };
  await loginSge(page, { baseUrl: process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br' });
  const primeiro = await lancarConteudoAplicado(page, habilitado);
  console.log(`[QAAUTO] Criado para lote: ${primeiro.id}`);
  const segundo = await lancarConteudoAplicado(page, habilitado);
  console.log(`[QAAUTO] Criado para lote: ${segundo.id}`);
  const preservado = await lancarConteudoAplicado(page, desabilitado);
  console.log(`[QAAUTO] Criado para preservação: ${preservado.id}`);
  const removidos = await excluirConteudosPorPrefixo(page, {
    escola: base.escola, turma: base.turma,
    excluirTodasQAAUTO: true, termoGeral: habilitado.habilidades, id: '', data: '',
  });
  expect(removidos.sort()).toEqual([primeiro.id, segundo.id].sort());
  await page.locator('#tabelaConteudoAplicado_wrapper input[type="search"]').fill(desabilitado.habilidades);
  await expect(page.locator(`#tabelaConteudoAplicado [id="${preservado.id}"]`)).toHaveCount(1);
  await excluirConteudoAplicadoLancamento(page, { ...desabilitado, ...preservado });
  console.log(`[QAAUTO] Removido registro de preservação: ${preservado.id}`);
});
