import { expect, type Page } from '@playwright/test';
import { isTipoOcorrenciaEscolarQAAuto } from '../factories/tipo-ocorrencia-escolar.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  abrirEdicaoTipoOcorrenciaEscolar,
  aguardarCarregamentoTipoOcorrenciaEscolar,
  pesquisarTipoOcorrenciaEscolar,
  linhaTipoOcorrenciaEscolar,
} from '../helpers/navigation/tipo-ocorrencia-escolar.navigation';

export interface TipoOcorrenciaEscolarExcluido {
  descricao: string;
  url: string;
}

/** Exclui pela tela somente o registro QAAUTO cuja descrição está configurada. */
export async function excluirTipoOcorrenciaEscolar(
  page: Page,
  descricao: string,
): Promise<TipoOcorrenciaEscolarExcluido> {
  const alvo = descricao.trim();
  if (!isTipoOcorrenciaEscolarQAAuto(alvo)) {
    throw new Error('A exclusão exige a descrição exata de um Tipo de Ocorrência Escolar QAAUTO com sequência.');
  }

  await pesquisarTipoOcorrenciaEscolar(page, alvo);
  const linha = linhaTipoOcorrenciaEscolar(page, alvo);
  await expect(linha.getByText(alvo, { exact: true })).toBeVisible({ timeout: 15000 });
  const quantidade = await linha.count();
  if (quantidade !== 1) {
    throw new Error(`A busca exata por "${alvo}" retornou ${quantidade} linhas; nenhuma foi removida.`);
  }
  await expect(linha.getByText(alvo, { exact: true })).toBeVisible();

  await abrirEdicaoTipoOcorrenciaEscolar(page, alvo);
  await excluirFormularioTipoOcorrenciaEscolar(page, alvo);
  await pesquisarTipoOcorrenciaEscolar(page, alvo);
  await expect(linhaTipoOcorrenciaEscolar(page, alvo)).toHaveCount(0, { timeout: 15000 });
  console.log(`[QAAUTO] Tipo excluído e ausente da consulta: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}

async function excluirFormularioTipoOcorrenciaEscolar(page: Page, alvo: string): Promise<void> {
  if (!/^QAAUTO\b/i.test(alvo)) throw new Error('O registro aberto deve começar com QAAUTO.');
  await expect(page.locator('#main #Descricao')).toHaveValue(alvo);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();

  const confirmacao = page.locator('.swal2-popup:visible');
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  const textoConfirmacao = (await confirmacao.innerText()).trim();
  if (!/(exclu|remov)/i.test(textoConfirmacao)) {
    throw new Error(`A confirmação visível não identifica a exclusão de "${alvo}": ${textoConfirmacao}`);
  }
  const confirmar = confirmacao.getByRole('button', { name: 'Sim', exact: true });
  await expect(confirmar).toBeVisible();
  await confirmar.click();

  const sucesso = page.locator('.swal2-popup:visible');
  await expect(sucesso).toContainText(/sucesso|exclu[ií]d[ao]|removid[ao]/i, { timeout: 20000 });
  const mensagem = (await sucesso.innerText()).trim();
  if (!/(sucesso|exclu[ií]d[ao]|removid[ao])/i.test(mensagem) || /(erro|falha|inválid)/i.test(mensagem)) {
    throw new Error(`O SGE não confirmou a exclusão de "${alvo}": ${mensagem}`);
  }
  const fechar = sucesso.getByRole('button', { name: /^(Ok|OK|Fechar)$/i });
  await expect(fechar).toBeVisible();
  await fechar.click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });

  await aguardarCarregamentoTipoOcorrenciaEscolar(page);
}

/** Lê todas as páginas da busca QAAUTO, incluindo descrições repetidas. */
async function listarTiposOcorrenciaEscolarQAAuto(page: Page): Promise<string[]> {
  await pesquisarTipoOcorrenciaEscolar(page, 'QAAUTO');
  const descricoes: string[] = [];
  const conteudo = page.locator('#main');
  while (true) {
    const celulas = getByRoleSge(conteudo, 'cell', { name: /^QAAUTO\b/i });
    for (const celula of await celulas.all()) {
      if (!await celula.isVisible()) continue;
      const descricao = (await celula.innerText()).trim();
      if (/^QAAUTO\b/i.test(descricao)) descricoes.push(descricao);
    }
    const proxima = conteudo.locator('#datatable_fixed_column_next_grid');
    if (!await proxima.isVisible() || await proxima.evaluate(el => el.classList.contains('disabled'))) break;
    const pagina = conteudo.locator('.pagination li.active');
    const paginaAnterior = await pagina.innerText();
    const respostaPromessa = page.waitForResponse(response =>
      new URL(response.url()).pathname.toLowerCase() === '/tipoocorrenciaescolar/indexgrid'
      && response.request().method() === 'GET');
    await proxima.locator('a').click();
    const resposta = await respostaPromessa;
    if (!resposta.ok()) throw new Error(`A paginação retornou HTTP ${resposta.status()}.`);
    await resposta.finished();
    await aguardarCarregamentoTipoOcorrenciaEscolar(page);
    await expect(pagina).not.toHaveText(paginaAnterior);
  }
  return descricoes;
}

/** Remove todos os tipos com prefixo QAAUTO, inclusive duplicados, somente pela UI. */
export async function excluirTiposOcorrenciaEscolarQAAuto(
  page: Page,
  aoEncontrarTotal?: (total: number) => void,
): Promise<number> {
  let pendentes = await listarTiposOcorrenciaEscolarQAAuto(page);
  if (pendentes.length === 0) throw new Error('Nenhum Tipo de Ocorrência Escolar QAAUTO encontrado para exclusão.');
  const total = pendentes.length;
  aoEncontrarTotal?.(total);
  let excluidos = 0;
  while (pendentes.length > 0) {
    const descricao = pendentes[0];
    console.log(`[QAAUTO] Excluindo Tipo de Ocorrência Escolar ${excluidos + 1}/${total}: ${descricao}`);
    await pesquisarTipoOcorrenciaEscolar(page, descricao);
    // No modo todos, cada cópia é alvo autorizado; remove uma por vez e reconta todas as páginas.
    const celula = linhaTipoOcorrenciaEscolar(page, descricao).first().getByText(descricao, { exact: true });
    await expect(celula).toBeVisible();
    await celula.click();
    await expect(getByRoleSge(page.locator('#main'), 'heading', { name: /Editar Tipo de Ocorrência Escolar/i }))
      .toBeVisible();
    await aguardarCarregamentoTipoOcorrenciaEscolar(page);
    await excluirFormularioTipoOcorrenciaEscolar(page, descricao);
    const restantes = await listarTiposOcorrenciaEscolarQAAuto(page);
    expect(restantes.length, `A grade deve confirmar a remoção de uma cópia de "${descricao}"`).toBe(pendentes.length - 1);
    excluidos++;
    console.log(`[QAAUTO] Tipo excluído e redução na grade conferida: ${descricao}`);
    pendentes = restantes;
  }
  console.log(`[QAAUTO] Exclusão concluída: ${excluidos} tipos removidos; nenhum QAAUTO restante.`);
  return excluidos;
}
