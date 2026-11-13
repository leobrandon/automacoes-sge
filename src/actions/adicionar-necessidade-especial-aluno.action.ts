import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { selecionarOpcaoApoio } from '../helpers/turma-apoio.helper';
import type { AlunoCriado } from './criar-aluno.action';

/** Adiciona a necessidade no cadastro do aluno recém-criado, ainda aberto na tela. */
export async function adicionarNecessidadeEspecialAluno(page: Page, aluno: AlunoCriado, necessidade: string, apoio: { recebeProfissional: 'Sim' | 'Não'; atendimentoExclusivo: 'Sim' | 'Não' }): Promise<void> {
  if (!necessidade.trim() || !aluno.cpf) throw new Error('Informe a necessidade especial e o CPF do aluno criado.');
  const form = page.locator('#form-aluno');
  await expect(getByRoleSge(page.locator('#main'), 'heading', { name: /Editar Aluno/i })).toBeVisible();
  await expect(form.locator('#PessoaNome')).toHaveValue(aluno.nome);
  await expect.poll(async () => (await form.locator('#PessoaCPF').inputValue()).replace(/\D/g, '')).toBe(aluno.cpf.replace(/\D/g, ''));
  if (aluno.id) await expect(form.locator('input#Id')).toHaveValue(aluno.id);

  await getByRoleSge(form, 'link', { name: 'Antropometria e Ficha Médica', exact: true }).click();
  await getByRoleSge(form, 'link', { name: 'Necessidades Especiais', exact: true }).click();
  const grade = form.locator('#gridNecessidadesEspeciais');
  await expect(grade).toBeVisible();
  await grade.locator('#btnAdicionarNecessidadeEspecial').click();
  const modal = page.locator('#pessoaNecessidadeEspecialModal');
  await expect(modal).toBeVisible();
  await selecionarOpcaoApoio(page, 'NecessidadeEspecial_Id', necessidade, 'necessidade especial', 'cadastro de aluno');
  await modal.locator('#btnSalvarNecessidadeEspecial').click();
  await expect(modal).toBeHidden();
  await expect(grade.getByText(necessidade, { exact: true })).toBeVisible();

  // Na edição, o SGE pode exigir esses campos quando a necessidade é informada.
  for (const [id, valor] of [['RecebeProfissionalDeApoio', apoio.recebeProfissional], ['AtendimentoExclusivo', apoio.atendimentoExclusivo]] as const) {
    const campo = form.locator(`#${id}`);
    if (await campo.isVisible()) await campo.selectOption({ label: valor });
  }
  await form.locator('#btnSubmit').click();
  const sucesso = page.getByRole('dialog').filter({ hasText: /sucesso|salvo/i });
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden();
  await expect(form.locator('#PessoaNome')).toHaveValue(aluno.nome);
}
