import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { adicionarNecessidadeEspecialAluno, alocarAlunoTurmaAee, criarAluno, criarTurmaAee } from '../../../../src/actions';
import { buildAluno, buildTurmaAee, type BuildTurmaAeeOptions } from '../../../../src/factories';
import { loginSge } from '../../../../src/helpers';
import { getByRoleSge } from '../../../../src/helpers/sge-locators.helper';

interface Configuracao {
  quantidadeAlunos: number;
  turma: BuildTurmaAeeOptions & { escolaNaConsulta: string };
  aluno: { escola: string; serie: string; turno: string; necessidadeEspecial: string; recebeProfissional: 'Sim' | 'Não'; atendimentoExclusivo: 'Sim' | 'Não'; diasComparecimento: string[]; atividades: string[] };
}

async function abrirConsultaDeAlunos(page: Page): Promise<void> {
  const menu = page.locator('#menu-gestao');
  const cadastro = menu.locator('a[onclick*="/alunoindex"]');
  await expect(cadastro).toHaveCount(1);
  if (!await cadastro.isVisible()) {
    const itemAluno = menu.locator(':scope > li.menu')
      .filter({ has: page.locator('a[onclick*="/alunoindex"]') })
      .locator(':scope > a');
    await expect(itemAluno).toHaveCount(1);
    await expect(itemAluno).toBeVisible();
    await itemAluno.click();
  }
  await expect(cadastro).toBeVisible();
  await cadastro.click();
  await expect(getByRoleSge(page.locator('#main'), 'heading', { name: /Consulta de (Alunos|Estudantes)/i })).toBeVisible({ timeout: 20000 });
}

test('cria turma AEE e alunos com necessidade especial e os aloca', async ({ page }) => {
  const config = JSON.parse(readFileSync(join(__dirname, 'dados_turma_aee_com_alunos.json'), 'utf8')) as Configuracao;
  if (!Number.isSafeInteger(config.quantidadeAlunos) || config.quantidadeAlunos < 1) throw new Error('quantidadeAlunos deve ser um inteiro positivo.');
  if (!config.turma || !config.aluno) throw new Error('Informe os objetos turma e aluno no JSON.');
  const { escolaNaConsulta, ...opcoesTurma } = config.turma;
  const turmaPrevia = buildTurmaAee(opcoesTurma);
  if (turmaPrevia.situacaoDesejada !== 'Ativo') throw new Error('A turma deve ser criada ativa para alocar alunos.');
  const a = config.aluno;
  for (const [nome, valor] of Object.entries({ escolaNaConsulta, escola: a.escola, serie: a.serie, turno: a.turno, necessidadeEspecial: a.necessidadeEspecial })) {
    if (typeof valor !== 'string' || !valor.trim()) throw new Error(`Informe ${nome} no JSON.`);
  }
  for (const [nome, valor] of Object.entries({ recebeProfissional: a.recebeProfissional, atendimentoExclusivo: a.atendimentoExclusivo })) {
    if (valor !== 'Sim' && valor !== 'Não') throw new Error(`${nome} deve ser "Sim" ou "Não" no JSON.`);
  }
  const dias: Record<string, string> = { Domingo: 'DOM', Segunda: 'SEG', Terça: 'TER', Quarta: 'QUA', Quinta: 'QUI', Sexta: 'SEX', Sábado: 'SAB' };
  if (!Array.isArray(a.diasComparecimento) || !a.diasComparecimento.length || a.diasComparecimento.some(dia => !turmaPrevia.diasDeAtendimento.some(d => dias[d] === dia))) throw new Error('diasComparecimento deve conter somente dias oferecidos pela turma.');
  if (!Array.isArray(a.atividades) || !a.atividades.length || a.atividades.some(atividade => !turmaPrevia.atividadesAee.includes(atividade as typeof turmaPrevia.atividadesAee[number]))) throw new Error('atividades deve conter somente atividades oferecidas pela turma.');

  test.setTimeout(Math.max(240000, 120000 + config.quantidadeAlunos * 180000));
  await loginSge(page, { baseUrl: process.env.BASE_URL || 'https://homologa-sge.pontoid.com.br', timeout: 60000 });
  const turma = await criarTurmaAee(page, opcoesTurma, 1, {
    onPersistida: t => console.log(`Turma salva: ${t.descricao} | Escola: ${t.unidadeEducacional} | Calendário: ${t.calendarioEscolar}`),
  });
  for (let i = 1; i <= config.quantidadeAlunos; i++) {
    const nome = `${turma.descricao} ALUNO ${i}`;
    console.log(`Aluno ${i}/${config.quantidadeAlunos}: iniciando cadastro de ${nome}.`);
    const dados = buildAluno({ escola: a.escola, serie: a.serie, turno: a.turno, nome });
    await abrirConsultaDeAlunos(page);
    const aluno = await criarAluno(page, dados);
    console.log(`Aluno criado: ${aluno.nome} | Matrícula: ${aluno.matricula ?? 'não informada'}.`);
    await adicionarNecessidadeEspecialAluno(page, aluno, a.necessidadeEspecial, { recebeProfissional: a.recebeProfissional, atendimentoExclusivo: a.atendimentoExclusivo });
    console.log(`Necessidade especial adicionada: ${aluno.nome} | ${a.necessidadeEspecial}.`);
    await alocarAlunoTurmaAee(page, {
      turma: turma.descricao, escolaTurma: escolaNaConsulta, calendario: turma.calendarioEscolar,
      escolaAluno: a.escola, aluno: aluno.nome, necessidadeEspecial: a.necessidadeEspecial,
      dias: a.diasComparecimento, atividades: a.atividades,
    });
    console.log(`Aluno alocado: ${aluno.nome} | Turma AEE: ${turma.descricao}.`);
  }
});
