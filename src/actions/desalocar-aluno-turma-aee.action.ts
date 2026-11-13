import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { celulaDescricaoTurmaAee, linhaTurmaAee, pesquisarTurmaAee } from '../helpers/navigation/turma-aee.navigation';

export interface DesalocacaoAlunoAee {
  turma: string;
  escolaTurma: string;
  calendario: string;
  escolaAluno: string;
  aluno: string;
}

function exato(texto: string): RegExp {
  return new RegExp(`^\\s*${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
}

/** Desaloca um vínculo cursando e preserva seu histórico. */
export async function desalocarAlunoTurmaAee(page: Page, dados: DesalocacaoAlunoAee): Promise<void> {
  for (const campo of ['turma', 'escolaTurma', 'calendario', 'escolaAluno', 'aluno'] as const) {
    if (typeof dados[campo] !== 'string' || !dados[campo].trim()) {
      throw new Error(`Informe ${campo} nos dados da desalocação AEE.`);
    }
  }

  await pesquisarTurmaAee(page, dados.turma);
  const turma = linhaTurmaAee(page, dados.turma);
  await expect(turma).toHaveCount(1);
  await expect(celulaDescricaoTurmaAee(turma, dados.turma)).toHaveCount(1);
  for (const texto of ['AEE', 'Ativa', dados.escolaTurma, dados.calendario]) {
    await expect(getByRoleSge(turma, 'cell', { name: texto, exact: true })).toBeVisible();
  }
  await turma.click();
  await expect(page.locator('#formEditarTurmaAEE #Descricao')).toHaveValue(exato(dados.turma));
  const menu = getByRoleSge(page.locator('#main'), 'link', { name: /Alocar e Desalocar/i });
  await expect(menu).toBeVisible();
  await menu.click();

  const form = page.locator('#formAlocarDesalocarAlunosNaTurmaAEE');
  await expect(form.locator('#Descricao')).toHaveValue(exato(dados.turma));
  await expect(form.locator('#CalendarioEscolar_Descricao')).toHaveValue(dados.calendario);
  const linhas = form.locator('#alunosAlocadosNaTurma tbody tr');
  const nome = page.getByText(exato(dados.aluno));
  const escola = page.getByText(exato(dados.escolaAluno));
  const cursando = page.getByText('Cursando', { exact: true });
  const alvo = linhas.filter({ has: nome }).filter({ has: escola }).filter({ has: cursando });
  await expect(alvo, `Esperado um vínculo cursando de ${dados.aluno} na escola ${dados.escolaAluno}.`).toHaveCount(1);
  await expect(form.locator('#alunosAlocadosNaTurma input.chkDesalocarAluno:checked')).toHaveCount(0);
  const checkbox = alvo.locator('input.chkDesalocarAluno');
  const idVinculo = await checkbox.getAttribute('data-alunoid');
  if (!idVinculo || !/^\d+$/.test(idVinculo)) throw new Error('O SGE não apresentou uma identificação numérica do vínculo a desalocar.');
  await checkbox.check();
  await form.locator('#btnDesalocar').click();

  const dialogo = page.locator('#dialog_desalocaAlunos');
  await expect(dialogo).toBeVisible();
  // O input do rádio é estilizado fora da área clicável; o texto visível seleciona a opção.
  await dialogo.getByText('Manter histórico do Aluno na turma', { exact: true }).click();
  await expect(dialogo.locator('#desalocarAlunoManterHistorico')).toBeChecked();
  await dialogo.locator('#btnSalvarDesaloca').click();
  const sucesso = page.getByRole('dialog').filter({ hasText: 'O Aluno foi desalocado.' });
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();

  const vinculo = linhas.filter({ has: page.locator(`input.chkDesalocarAluno[data-alunoid="${idVinculo}"]`) });
  await expect(vinculo).toHaveCount(1);
  await expect(getByRoleSge(vinculo, 'cell', { name: 'Desalocado', exact: true })).toBeVisible();
  await expect(getByRoleSge(vinculo, 'cell', { name: dados.aluno, exact: true })).toBeVisible();
  await expect(getByRoleSge(vinculo, 'cell', { name: dados.escolaAluno, exact: true })).toBeVisible();
}
