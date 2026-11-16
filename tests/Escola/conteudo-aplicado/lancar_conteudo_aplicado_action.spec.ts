import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  lancarConteudoAplicado,
  validarDadosConteudoAplicado,
  type ConteudoAplicadoLancamentoDados,
} from '../../../src/actions';
import { loginSge } from '../../../src/helpers';

test('lança Conteúdo Aplicado em Escola', async ({ page }) => {
  test.setTimeout(120000);
  const dados = JSON.parse(readFileSync(join(__dirname, 'dados_conteudo_aplicado.json'), 'utf8')) as ConteudoAplicadoLancamentoDados;
  validarDadosConteudoAplicado(dados);
  await loginSge(page, { baseUrl: process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br' });
  await lancarConteudoAplicado(page, dados);

  await expect(page.locator('#formAddConteudo')).toBeHidden();
});
