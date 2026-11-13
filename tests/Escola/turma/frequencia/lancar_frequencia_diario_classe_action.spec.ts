import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lancarFrequenciaDiarioClasse, type LancamentoFrequenciaDados } from '../../../../src/actions';
import { loginSge } from '../../../../src/helpers';

test('gera o diário de classe e lança presença e falta alternadas', async ({ page }) => {
  test.setTimeout(240000);
  const dados = JSON.parse(readFileSync(join(__dirname, 'dados_frequencia_diario_classe.json'), 'utf8')) as LancamentoFrequenciaDados;
  await loginSge(page, { baseUrl: process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br', timeout: 60000 });
  const lancadas = await lancarFrequenciaDiarioClasse(page, dados);
  console.log(lancadas.map((l) => `${l.data} ${l.aluno}: ${l.presente ? 'presença' : 'falta'}`).join('\n'));
});
