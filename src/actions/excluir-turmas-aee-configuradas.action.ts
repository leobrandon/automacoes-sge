import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { pesquisarTurmaAee } from '../helpers/navigation/turma-aee.navigation';

export interface AlvoExclusaoTurmaAee { descricao: string; escola: string; calendario: string }
export interface ConfiguracaoExclusaoTurmaAee { excluirTodasQAAUTO: boolean; descricao: string; escola: string; calendario: string }
export interface ResultadoExclusaoTurmasAee { excluidas: AlvoExclusaoTurmaAee[]; impedidas: Array<AlvoExclusaoTurmaAee & { motivo: string }> }

const normalizar = (texto: string) => texto.trim().toLocaleUpperCase('pt-BR');
const chave = (alvo: AlvoExclusaoTurmaAee) => [alvo.descricao, alvo.escola, alvo.calendario].map(normalizar).join('\u0000');

export function validarExclusaoTurmasAee(valor: unknown): ConfiguracaoExclusaoTurmaAee {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('O JSON de exclusão deve conter um objeto.');
  const c = valor as Record<string, unknown>;
  if (typeof c.excluirTodasQAAUTO !== 'boolean') throw new Error('excluirTodasQAAUTO deve ser true ou false.');
  for (const campo of ['descricao', 'escola', 'calendario']) {
    if (typeof c[campo] !== 'string') throw new Error(`${campo} deve ser texto.`);
  }
  const resultado = { excluirTodasQAAUTO: c.excluirTodasQAAUTO, descricao: (c.descricao as string).trim(), escola: (c.escola as string).trim(), calendario: (c.calendario as string).trim() };
  if (resultado.excluirTodasQAAUTO && (resultado.descricao || resultado.escola || resultado.calendario)) throw new Error('No modo lote deixe descricao, escola e calendario vazios.');
  if (!resultado.excluirTodasQAAUTO && (!resultado.descricao || !resultado.escola || !resultado.calendario)) throw new Error('Para exclusão individual informe descricao, escola e calendario exatos; ou configure excluirTodasQAAUTO como true para o lote.');
  return resultado;
}

/** Lê todas as páginas da grade antes de selecionar qualquer registro. */
async function consultarTurmas(page: Page, termo: string): Promise<AlvoExclusaoTurmaAee[]> {
  await pesquisarTurmaAee(page, termo);
  const main = page.locator('#main');
  const resultados: AlvoExclusaoTurmaAee[] = [];
  let fimAnterior = 0;
  for (;;) {
    const linhas = main.locator('table tbody tr');
    for (const linha of await linhas.all()) {
      const celulas = linha.locator('td');
      if (await celulas.count() < 20) continue;
      const valores = await celulas.allInnerTexts();
      if (normalizar(valores[2]) !== 'AEE') continue;
      const alvo = { descricao: valores[1].trim(), calendario: valores[6].trim(), escola: valores[16].trim() };
      if (!alvo.descricao || !alvo.calendario || !alvo.escola) throw new Error('A grade retornou uma Turma AEE sem descrição, escola ou calendário.');
      resultados.push(alvo);
    }
    if (await main.getByText('<Nenhum resultado>', { exact: true }).isVisible()) return resultados;
    const resumo = await main.locator('#datatable_fixed_column_info_grid').innerText();
    const partes = resumo.match(/Mostrando\s+(\d+)\s+até\s+(\d+)\s+de\s+(\d+)\s+registros/i);
    if (!partes) {
      throw new Error('Não foi possível interpretar a paginação da consulta de turmas.');
    }
    const inicio = Number(partes[1]), fim = Number(partes[2]), total = Number(partes[3]);
    if (inicio !== fimAnterior + 1 || fim < inicio || fim > total) throw new Error('A paginação da consulta de turmas apresentou uma sequência inconsistente.');
    if (fim === total) break;
    fimAnterior = fim;
    const proxima = getByRoleSge(main, 'link', { name: 'Próxima', exact: true });
    await expect(proxima).toBeVisible();
    const [resposta] = await Promise.all([
      page.waitForResponse(r => /\/turma\/indexgrid$/i.test(new URL(r.url()).pathname) && r.request().method() === 'GET', { timeout: 20000 }),
      proxima.click(),
    ]);
    if (!resposta.ok()) throw new Error(`A página seguinte da consulta retornou HTTP ${resposta.status()}.`);
    await expect.poll(async () => (await main.locator('#datatable_fixed_column_info_grid').innerText()).match(/Mostrando\s+(\d+)/i)?.[1]).toBe(String(fimAnterior + 1));
  }
  return resultados;
}

async function abrirAlvo(page: Page, alvo: AlvoExclusaoTurmaAee): Promise<void> {
  const todos = await consultarTurmas(page, alvo.descricao);
  if (todos.filter(t => chave(t) === chave(alvo)).length !== 1) throw new Error(`Turma ambígua ou não encontrada: ${alvo.descricao} | ${alvo.escola} | ${alvo.calendario}.`);
  // Reexecuta a busca para percorrer as páginas até a linha exata, sem depender da ordem da consulta anterior.
  await pesquisarTurmaAee(page, alvo.descricao);
  const main = page.locator('#main');
  for (;;) {
    const linhas = main.locator('table tbody tr');
    for (const linha of await linhas.all()) {
      const cells = linha.locator('td');
      if (await cells.count() < 20) continue;
      const v = await cells.allInnerTexts();
      if (normalizar(v[2]) !== 'AEE' || chave({ descricao: v[1], calendario: v[6], escola: v[16] }) !== chave(alvo)) continue;
      await linha.click();
      const form = page.locator('#formEditarTurmaAEE');
      await expect(form.locator('#Descricao')).toHaveValue(new RegExp(`^\\s*${alvo.descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'));
      await expect(form.locator('#CalendarioEscolar_Descricao')).toHaveValue(alvo.calendario);
      return;
    }
    const resumo = (await main.locator('#datatable_fixed_column_info_grid').innerText()).match(/Mostrando\s+(\d+)\s+até\s+(\d+)\s+de\s+(\d+)\s+registros/i);
    if (!resumo || Number(resumo[2]) >= Number(resumo[3])) throw new Error(`Turma não encontrada ao reabrir: ${alvo.descricao}.`);
    const fim = Number(resumo[2]);
    const [resposta] = await Promise.all([
      page.waitForResponse(r => /\/turma\/indexgrid$/i.test(new URL(r.url()).pathname) && r.request().method() === 'GET', { timeout: 20000 }),
      getByRoleSge(main, 'link', { name: 'Próxima', exact: true }).click(),
    ]);
    if (!resposta.ok()) throw new Error(`A consulta retornou HTTP ${resposta.status()}.`);
    await expect.poll(async () => (await main.locator('#datatable_fixed_column_info_grid').innerText()).match(/Mostrando\s+(\d+)/i)?.[1]).toBe(String(fim + 1));
  }
}

export async function excluirTurmasAeeConfiguradas(page: Page, config: ConfiguracaoExclusaoTurmaAee): Promise<ResultadoExclusaoTurmasAee> {
  const c = validarExclusaoTurmasAee(config);
  const encontradas = await consultarTurmas(page, c.excluirTodasQAAUTO ? 'QAAUTO' : c.descricao);
  const alvos = encontradas.filter(t => c.excluirTodasQAAUTO ? /^QAAUTO\b/i.test(t.descricao) : chave(t) === chave(c));
  if (!c.excluirTodasQAAUTO && alvos.length !== 1) throw new Error('A turma individual não foi encontrada ou a identificação é ambígua.');
  if (new Set(alvos.map(chave)).size !== alvos.length) throw new Error('Há turmas AEE com identificação ambígua; nenhuma exclusão foi iniciada.');
  const resultado: ResultadoExclusaoTurmasAee = { excluidas: [], impedidas: [] };
  for (const alvo of alvos) {
    await abrirAlvo(page, alvo);
    const form = page.locator('#formEditarTurmaAEE');
    await getByRoleSge(form, 'link', { name: 'Alunos na Turma', exact: true }).click();
    if (!await form.getByText('<Não possui alunos alocados>', { exact: true }).isVisible()) {
      resultado.impedidas.push({ ...alvo, motivo: 'A turma apresenta alunos associados ou a lista não está vazia.' });
      console.log(`Não excluída: ${alvo.descricao} | alunos associados ou lista não vazia.`);
      continue;
    }
    await getByRoleSge(form, 'button', { name: /Excluir/i }).click();
    const confirmacao = page.getByRole('dialog').filter({ hasText: /Deseja realmente\s*excluir\s*essa Turma de AEE\?/i });
    await expect(confirmacao).toBeVisible();
    await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();
    const feedback = page.getByRole('dialog').filter({ has: page.getByRole('button', { name: 'Ok', exact: true }) });
    await expect(feedback).toBeVisible({ timeout: 20000 });
    const mensagem = (await feedback.innerText()).trim();
    const sucesso = /A turma de AEE foi excluída!/i.test(mensagem);
    await feedback.getByRole('button', { name: 'Ok', exact: true }).click();
    await expect(feedback).toBeHidden();
    if (!sucesso) {
      resultado.impedidas.push({ ...alvo, motivo: mensagem });
      console.log(`Não excluída: ${alvo.descricao} | ${mensagem}`);
      continue;
    }
    const restante = await consultarTurmas(page, alvo.descricao);
    if (restante.some(t => chave(t) === chave(alvo))) throw new Error(`A exclusão de ${alvo.descricao} não foi confirmada na consulta.`);
    resultado.excluidas.push(alvo);
    console.log(`Turma AEE excluída: ${alvo.descricao} | ${alvo.escola} | ${alvo.calendario}`);
  }
  return resultado;
}
