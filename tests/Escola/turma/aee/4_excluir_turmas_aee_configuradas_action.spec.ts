import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { excluirTurmasAeeConfiguradas, validarExclusaoTurmasAee } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';

test('exclui turmas AEE conforme a configuração', async ({ page }) => {
  test.setTimeout(600000);
  const dados = validarExclusaoTurmasAee(
    JSON.parse(readFileSync(join(__dirname, 'dados_exclusao_turma_aee.json'), 'utf8')),
  );
  await loginSge(page, {
    baseUrl: process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br',
    timeout: 60000,
  });

  const resultado = await excluirTurmasAeeConfiguradas(page, dados);
  console.log(`Turmas AEE excluídas: ${resultado.excluidas.length} | Impedidas: ${resultado.impedidas.length}`);

  if (resultado.impedidas.length) {
    const detalhes = resultado.impedidas.map((t) => `${t.descricao}: ${t.motivo}`).join(' | ');
    throw new Error(`Não foi possível excluir ${resultado.impedidas.length} turma(s): ${detalhes}`);
  }
});
