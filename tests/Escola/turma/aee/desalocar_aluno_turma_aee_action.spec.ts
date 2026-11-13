import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { desalocarAlunoTurmaAee, type DesalocacaoAlunoAee } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';

test('desaloca aluno de turma AEE preservando o histórico', async ({ page }) => {
  test.setTimeout(180000);
  const dados = JSON.parse(readFileSync(join(__dirname, 'dados_desalocacao_aluno_aee.json'), 'utf8')) as DesalocacaoAlunoAee;
  await loginSge(page, { baseUrl: process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br', timeout: 60000 });
  await desalocarAlunoTurmaAee(page, dados);
  console.log(`Aluno desalocado: ${dados.aluno} | Turma AEE: ${dados.turma}`);
});
