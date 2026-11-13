import { expect, type Page } from '@playwright/test';
import { isTurmaAeeQAAuto } from '../factories/turma-aee.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { celulaDescricaoTurmaAee, linhaTurmaAee, pesquisarTurmaAee } from '../helpers/navigation/turma-aee.navigation';
import type { TurmaAeeIdentificador } from './criar-turma-aee.action';

export interface TurmaAeeExcluida {
  descricao: string;
  url: string;
}

function normalizar(texto: string): string {
  return texto.trim().toLocaleLowerCase('pt-BR');
}

function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Exclui somente a Turma AEE retornada pela ação de criação desta execução. */
export async function excluirTurmaAee(page: Page, criada: TurmaAeeIdentificador): Promise<TurmaAeeExcluida> {
  const descricao = criada.descricao.trim();
  if (!isTurmaAeeQAAuto(descricao)) {
    throw new Error('A exclusão automatizada requer uma descrição iniciada por QAAUTO.');
  }

  await pesquisarTurmaAee(page, descricao);
  const linha = linhaTurmaAee(page, descricao);
  await expect(linha).toHaveCount(1);
  const celulaDescricao = celulaDescricaoTurmaAee(linha, descricao);
  await expect(celulaDescricao).toHaveCount(1);
  await expect(celulaDescricao).toHaveText(new RegExp(`^\\s*${escapeRegex(descricao)}\\s*$`, 'i'));
  await expect(getByRoleSge(linha, 'cell', { name: 'AEE', exact: true })).toBeVisible();
  await expect(getByRoleSge(linha, 'cell', { name: criada.calendarioEscolar, exact: true })).toBeVisible();

  const escolaDaGrade = criada.unidadeEducacional.split(' - ')[0].trim();
  await expect(getByRoleSge(linha, 'cell').filter({ hasText: new RegExp(escapeRegex(escolaDaGrade), 'i') })).toHaveCount(1);
  await linha.click();

  const formulario = page.locator('#formEditarTurmaAEE');
  await expect(getByRoleSge(page.locator('#main'), 'heading', { name: /Editar Turma de AEE/i })).toBeVisible();
  await expect(formulario.locator('#Descricao')).toHaveValue(new RegExp(`^\\s*${escapeRegex(descricao)}\\s*$`, 'i'));
  await expect(formulario.locator('#CalendarioEscolar_Descricao')).toHaveValue(criada.calendarioEscolar);

  const escolaPersistida = await formulario.locator('#Escola_NomeFantasiaComInep').inputValue();
  const codigoInep = criada.unidadeEducacional.match(/\b\d{8}\b/)?.[0];
  const escolaAlvo = codigoInep ?? escolaDaGrade.split(' - ')[0];
  if (!normalizar(escolaPersistida).includes(normalizar(escolaAlvo))) {
    throw new Error(`A edição abriu a escola "${escolaPersistida}", não a escola esperada "${escolaAlvo}".`);
  }

  const abaAlunos = getByRoleSge(formulario, 'link', { name: 'Alunos na Turma', exact: true });
  await abaAlunos.click();
  await expect(formulario.getByText('<Não possui alunos alocados>', { exact: true })).toBeVisible();

  const excluir = getByRoleSge(formulario, 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();

  const confirmacao = page.getByRole('dialog').filter({ hasText: /Deseja realmente\s*excluir\s*essa Turma de AEE\?/i });
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await expect(confirmacao).toContainText(/irreversível/i);
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

  const sucesso = page.getByRole('dialog').filter({ hasText: /A turma de AEE foi excluída!/i });
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });

  await pesquisarTurmaAee(page, descricao);
  await expect(linhaTurmaAee(page, descricao)).toHaveCount(0);
  return { descricao, url: page.url() };
}
