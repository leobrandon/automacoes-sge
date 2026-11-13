import { expect, type Page } from '@playwright/test';
import { isTurmaDiversificadaQAAuto } from '../factories/turma-diversificada.factory';
import { escaparRegexTurma } from '../helpers/navigation/turma.navigation';
import {
  celulaDescricaoTurmaDiversificada,
  linhaTurmaDiversificada,
  pesquisarTurmaDiversificada,
} from '../helpers/navigation/turma-diversificada.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import type { TurmaDiversificadaIdentificador } from './criar-turma-diversificada.action';

export interface TurmaDiversificadaExcluida {
  descricao: string;
  url: string;
}

async function excluirRascunhoPelaGrade(page: Page, descricao: string): Promise<void> {
  const linha = linhaTurmaDiversificada(page, descricao);
  // Ícone sem texto: o title identifica a ação.
  const remover = linha.locator('[title="Excluir rascunho da turma"]');
  await expect(remover).toBeVisible();
  await remover.click();

  const confirmacao = page.getByRole('dialog').filter({ hasText: /Tem certeza que deseja remover o rascunho dessa turma\?/i });
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

  const sucesso = page.getByRole('dialog').filter({ hasText: /A turma rascunho foi removida\./i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i }).filter({ hasNotText: /Tem certeza/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible() && !await sucesso.first().isVisible()) {
    const aviso = (await atencao.first().innerText()).replace(/\s+/g, ' ').trim();
    throw new Error(`O SGE não removeu o rascunho "${descricao}": ${aviso}`);
  }
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });

  await pesquisarTurmaDiversificada(page, descricao);
  await expect(linhaTurmaDiversificada(page, descricao)).toHaveCount(0);
  console.log(`[QAAUTO] Rascunho de Turma Diversificada removido e ausência conferida: ${descricao}`);
}

/** Exclui somente a Turma Diversificada QAAUTO retornada pela ação de criação desta execução. */
export async function excluirTurmaDiversificada(
  page: Page,
  criada: TurmaDiversificadaIdentificador,
): Promise<TurmaDiversificadaExcluida> {
  const descricao = criada.descricao.trim();
  if (!isTurmaDiversificadaQAAuto(descricao)) {
    throw new Error('A exclusão automatizada requer uma descrição iniciada por QAAUTO.');
  }

  await pesquisarTurmaDiversificada(page, descricao);
  const linha = linhaTurmaDiversificada(page, descricao);
  await expect(linha).toHaveCount(1);
  await expect(celulaDescricaoTurmaDiversificada(linha, descricao)).toHaveCount(1);
  await expect(getByRoleSge(linha, 'cell', { name: 'Diversificada', exact: true })).toBeVisible();
  await expect(getByRoleSge(linha, 'cell', { name: criada.calendarioEscolar, exact: true })).toBeVisible();

  // Rascunho não tem botão Excluir na edição: a remoção é o ícone da própria linha da grade.
  if (await getByRoleSge(linha, 'cell', { name: 'Rascunho', exact: true }).count() > 0) {
    await excluirRascunhoPelaGrade(page, descricao);
    return { descricao, url: page.url() };
  }
  await linha.click();

  const conteudo = page.locator('#main');
  const formulario = conteudo.locator('#form_turma');
  await expect(getByRoleSge(conteudo, 'heading', { name: /Editar Turma Diversificada/i })).toBeVisible();
  await expect(formulario.locator('#Descricao')).toHaveValue(new RegExp(`^\\s*${escaparRegexTurma(descricao)}\\s*$`, 'i'));
  await expect(formulario.locator('#SerieComposicao_ComposicaoCalendario_CalendarioEscolar_Descricao')).toHaveValue(criada.calendarioEscolar);

  // A turma desta execução não tem alunos; se tiver, a exclusão não deve prosseguir.
  await formulario.locator('.nav-tabs a').filter({ hasText: 'Alunos na Turma' }).click();
  const abaAlunos = formulario.locator('#tabAlunosNaTurma');
  await expect(abaAlunos.locator('table')).toBeVisible();
  await expect(abaAlunos.locator('table tbody tr')).toHaveCount(0);

  const excluir = conteudo.locator('#btn_excluir');
  await expect(excluir).toBeVisible();
  await excluir.click();

  const confirmacao = page.getByRole('dialog').filter({ hasText: /Tem certeza que deseja excluir essa turma\?/i });
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await expect(confirmacao).toContainText(/irreversível/i);
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();

  // O SweetAlert reaproveita o mesmo diálogo: a pergunta some antes do resultado aparecer.
  const sucesso = page.getByRole('dialog').filter({ hasText: /Turma excluída/i });
  const atencao = page.getByRole('dialog').filter({ hasText: /Atenção/i }).filter({ hasNotText: /Tem certeza/i });
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible() && !await sucesso.first().isVisible()) {
    const aviso = (await atencao.first().innerText()).replace(/\s+/g, ' ').trim();
    throw new Error(`O SGE não excluiu a Turma Diversificada "${descricao}": ${aviso}`);
  }
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });

  await pesquisarTurmaDiversificada(page, descricao);
  await expect(linhaTurmaDiversificada(page, descricao)).toHaveCount(0);

  console.log(`[QAAUTO] Turma Diversificada excluída e ausência conferida: ${descricao}`);
  return { descricao, url: page.url() };
}
