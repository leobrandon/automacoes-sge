import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { excluirConteudoAplicadoLancamento, lancarConteudoAplicado, type ConteudoAplicadoLancamentoDados } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';

test('cria e exclui o próprio Conteúdo Aplicado', async ({ page }) => {
  test.setTimeout(180000);
  const dados = JSON.parse(readFileSync(join(__dirname, 'dados_conteudo_aplicado.json'), 'utf8')) as ConteudoAplicadoLancamentoDados;
  await loginSge(page, { baseUrl: process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br' });
  const criado = await lancarConteudoAplicado(page, dados);
  console.log(`[QAAUTO] Criado: ${criado.id}, data ${criado.data}`);
  await excluirConteudoAplicadoLancamento(page, { ...dados, ...criado });
  console.log(`[QAAUTO] Excluído e conferido: ${criado.id}`);
});
