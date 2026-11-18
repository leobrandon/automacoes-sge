import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { alocarAlunoTurmaAee, type AlocacaoAlunoAee } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';

test('aloca aluno com necessidade especial em turma AEE existente', async ({ page }) => {
  test.setTimeout(180000);
  const dados = JSON.parse(readFileSync(join(__dirname, 'dados_alocacao_aluno_aee.json'), 'utf8')) as AlocacaoAlunoAee;
  await loginSge(page, { baseUrl: process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br', timeout: 60000 });
  await alocarAlunoTurmaAee(page, dados);
  console.log(`Aluno alocado: ${dados.aluno} | Turma AEE: ${dados.turma}`);
});
