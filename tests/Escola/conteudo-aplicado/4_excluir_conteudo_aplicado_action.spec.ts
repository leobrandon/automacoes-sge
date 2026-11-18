import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { excluirConteudosPorPrefixo, excluirConteudoAplicadoLancamento, validarLoteConteudo, type ConfiguracaoLoteConteudo, type ConteudoAplicadoLancamentoDados } from '../../../src/actions';
import { loginSge } from '../../../src/helpers';

test('exclui Conteúdo Aplicado conforme configuração', async ({ page }) => {
  test.setTimeout(600000);
  const config = JSON.parse(readFileSync(join(__dirname, 'dados_exclusao_conteudo_aplicado.json'), 'utf8')) as ConfiguracaoLoteConteudo;
  validarLoteConteudo(config);
  await loginSge(page, { baseUrl: process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br' });
  if (config.excluirTodasQAAUTO) {
    const excluidos = await excluirConteudosPorPrefixo(page, config);
    console.log(`[QAAUTO] ${excluidos.length} conteúdo(s) excluído(s).`);
  } else {
    const dados = JSON.parse(readFileSync(join(__dirname, 'dados_conteudo_aplicado.json'), 'utf8')) as ConteudoAplicadoLancamentoDados;
    await excluirConteudoAplicadoLancamento(page, { ...dados, escola: config.escola, turma: config.turma, id: config.id, data: config.data });
    console.log(`[QAAUTO] Excluído: ${config.id}`);
  }
});
