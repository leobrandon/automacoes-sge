import { expect, type Locator, type Page } from '@playwright/test';
import { isTipoRegistroPedagogicoQAAuto } from '../../factories/tipo-registro-pedagogico.factory';
import {
  linhaTipoRegistroPedagogico,
  navegarParaConsultaTipoRegistroPedagogico,
  pesquisarTipoRegistroPedagogico,
} from '../../helpers/navigation/tipo-registro-pedagogico.navigation';
import { waitForSgeLoaders } from '../../helpers/navigation/common.navigation';
import { getByRoleSge } from '../../helpers/sge-locators.helper';
import type {
  TipoRegistroPedagogicoAlvoExclusao,
  TipoRegistroPedagogicoExcluido,
} from './tipo-registro-pedagogico.types';

function normalizar(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
}

function normalizarLista(valor: string): string[] {
  return valor.split(/[,;\n]+/).map((item) => normalizar(item)).filter(Boolean).sort();
}

function celulaVisivel(linha: Locator, indice: number): Locator {
  return linha.locator('td:visible').nth(indice);
}

function compararColuna(linha: Locator, indice: number, esperado: string, campo: string): Promise<void> {
  return expect(celulaVisivel(linha, indice), 'coluna ' + campo).toHaveText(esperado);
}

async function validarAnosConfigurados(linha: Locator, anosEsperados: string[]): Promise<void> {
  const anosDaGrade = normalizarLista(await celulaVisivel(linha, 4).innerText());
  const esperados = anosEsperados.map(normalizar).sort();
  if (JSON.stringify(anosDaGrade) !== JSON.stringify(esperados)) {
    throw new Error('Os anos escolares da grade não correspondem ao alvo de exclusão configurado.');
  }
}

async function validarFormulario(page: Page, alvo: TipoRegistroPedagogicoAlvoExclusao): Promise<void> {
  const formulario = page.locator('#main');
  const titulo = getByRoleSge(formulario, 'heading', { name: /Editar Tipo de Registro Pedagógico/i });
  await expect(titulo).toBeVisible({ timeout: 20000 });
  const textoTitulo = normalizar(await titulo.innerText());
  if (!textoTitulo.includes(normalizar(alvo.tipo))) {
    throw new Error('O formulário aberto não pertence ao tipo configurado: ' + textoTitulo);
  }

  await expect(formulario.locator('#Descricao')).toHaveValue(alvo.descricao);
  if (alvo.tipo === 'Atividades Específicas') {
    // Apenas Atividades Específicas apresenta a turma como texto desabilitado.
    const rotuloTipoTurma = formulario.locator('label').filter({ hasText: /^\s*Tipo de Turma\s*\*?\s*$/i });
    await expect(rotuloTipoTurma).toHaveCount(1);
    const tipoTurma = getByRoleSge(rotuloTipoTurma.locator('..'), 'textbox');
    await expect(tipoTurma).toBeVisible();
    await expect(tipoTurma).toBeDisabled();
    await expect(tipoTurma).toHaveValue(alvo.tipoTurma);
  } else {
    // Os demais tipos mantêm o seletor TipoTurma, apresentado pelo Select2.
    await expect(formulario.locator('#TipoTurma')).toHaveCount(1);
    await expect(formulario.locator('#TipoTurma option:checked')).toHaveText(alvo.tipoTurma);
  }
  if (alvo.composicao) {
    await expect(formulario.locator('#ComposicaoEnsinoId option:checked')).toHaveText(alvo.composicao);
  }
  if (alvo.anosEscolares?.length) {
    const anosMarcados = (await formulario.locator('#AnosEscolares option:checked').allTextContents())
      .map(normalizar)
      .sort();
    const anosEsperados = alvo.anosEscolares.map(normalizar).sort();
    if (JSON.stringify(anosMarcados) !== JSON.stringify(anosEsperados)) {
      throw new Error('Os anos escolares do formulário não correspondem ao alvo de exclusão configurado.');
    }
  }
}

async function confirmarExclusao(page: Page, descricao: string): Promise<void> {
  const dialogos = page.locator(
    '.swal2-popup:visible, #MsgBoxBack:visible, .divMessageBox:visible, .MessageBoxContainer:visible, [role="dialog"]:visible',
  );
  const confirmacao = dialogos.last();
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  const mensagem = (await confirmacao.innerText()).trim();
  if (!/excluir|remover|apagar|tem certeza/i.test(mensagem)) {
    throw new Error('A confirmação de exclusão apresentou conteúdo inesperado: ' + mensagem);
  }
  if (/QAAUTO/i.test(mensagem) && !normalizar(mensagem).includes(normalizar(descricao))) {
    throw new Error('O aviso de exclusão menciona uma descrição QAAUTO diferente do alvo configurado.');
  }

  const confirmar = confirmacao.getByRole('button', { name: /^(Sim|Excluir|Confirmar)$/i }).first();
  await expect(confirmar).toBeVisible({ timeout: 10000 });
  await confirmar.click();
  await waitForSgeLoaders(page);

  const feedback = page.locator(
    '.swal2-popup:visible, #MsgBoxBack:visible, .divMessageBox:visible, .MessageBoxContainer:visible, [role="dialog"]:visible',
  ).filter({ hasText: /sucesso|excluíd|removid|deletad|erro|falha|não foi possível/i }).last();
  await expect(feedback).toBeVisible({ timeout: 20000 });
  const textoFeedback = (await feedback.innerText()).trim();
  if (/erro|falha|não foi possível|não foi exclu/i.test(textoFeedback)) {
    throw new Error('O SGE não confirmou a exclusão de "' + descricao + '": ' + textoFeedback);
  }
  if (!/sucesso|excluíd|removid|deletad/i.test(textoFeedback)) {
    throw new Error('O SGE exibiu feedback inesperado após excluir "' + descricao + '": ' + textoFeedback);
  }

  const fechar = feedback.getByRole('button', { name: /^(Ok|OK|Fechar)$/i }).first();
  await expect(fechar).toBeVisible({ timeout: 10000 });
  await fechar.click();
  await expect(feedback).toBeHidden({ timeout: 15000 });
}

/** Exclui apenas a descrição QAAUTO configurada, após conferir a linha e o formulário de edição. */
export async function excluirTipoRegistroPedagogico(
  page: Page,
  alvo: TipoRegistroPedagogicoAlvoExclusao,
): Promise<TipoRegistroPedagogicoExcluido> {
  const descricao = alvo.descricao.trim();
  if (!isTipoRegistroPedagogicoQAAuto(descricao) || !/\s1$/.test(descricao)) {
    throw new Error('A exclusão requer a descrição QAAUTO exata configurada com sequência 1.');
  }

  await navegarParaConsultaTipoRegistroPedagogico(page);
  await expect(page.locator('#header')).toContainText(new RegExp('ANO LETIVO:\\s*' + alvo.ano, 'i'));
  await pesquisarTipoRegistroPedagogico(page, descricao);

  const linha = linhaTipoRegistroPedagogico(page, descricao);
  await expect(linha).toHaveCount(1);
  const descricaoNaLinha = (await celulaVisivel(linha, 0).innerText()).trim();
  if (normalizar(descricaoNaLinha) !== normalizar(descricao)) {
    throw new Error('A linha encontrada não corresponde à descrição QAAUTO configurada.');
  }
  await compararColuna(linha, 1, alvo.tipo, 'tipo');
  await compararColuna(linha, 2, alvo.tipoTurma, 'tipo de turma');
  if (alvo.composicao) await compararColuna(linha, 3, alvo.composicao, 'composição');
  if (alvo.anosEscolares?.length) await validarAnosConfigurados(linha, alvo.anosEscolares);

  await celulaVisivel(linha, 0).click();
  await validarFormulario(page, alvo);
  console.log('[QAAUTO] Alvo conferido na edição; iniciando exclusão: ' + descricao);

  const excluir = page.locator('#main #btn_excluir:visible');
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusao(page, descricao);

  await navegarParaConsultaTipoRegistroPedagogico(page);
  await pesquisarTipoRegistroPedagogico(page, descricao);
  await expect(linhaTipoRegistroPedagogico(page, descricao)).toHaveCount(0);
  console.log('[QAAUTO] Exclusão confirmada e ausência na grade: ' + descricao);
  return { descricao, tipo: alvo.tipo, url: page.url() };
}
