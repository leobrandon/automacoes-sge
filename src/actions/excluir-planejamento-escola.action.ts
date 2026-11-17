import { expect, type Page } from '@playwright/test';
import {
  linhaPlanejamento,
  navegarParaPlanejamentoEscola,
  pesquisarPlanejamentos,
  type FiltroPlanejamentoEscola,
} from '../helpers/navigation/planejamento-escola.navigation';

const ROTA_EXCLUIR = '/planejamentoturma/delete';

/** O planejamento não tem nome; só o tipo com prefixo QAAUTO prova que a massa é da automação. */
function exigirTipoQAAuto(tipoPlanejamento: string): void {
  if (!/^QAAUTO\b/i.test(tipoPlanejamento.trim())) {
    throw new Error(`Exclusão recusada: o tipo de planejamento "${tipoPlanejamento}" não começa por QAAUTO.`);
  }
}

async function excluirLinhaAtual(page: Page, periodo: string): Promise<void> {
  const linha = linhaPlanejamento(page, periodo);
  await linha.getByTitle('Deletar elaboração').click();
  const confirmacao = page.locator('.swal2-popup:visible').filter({ hasText: 'Esta ação excluirá o registro selecionado.' });
  await expect(confirmacao).toBeVisible({ timeout: 30000 });
  const [resposta] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname.toLowerCase() === ROTA_EXCLUIR, { timeout: 30000 }),
    confirmacao.getByRole('button', { name: 'Sim', exact: true }).click(),
  ]);
  if (!resposta.ok()) throw new Error(`A exclusão do planejamento retornou HTTP ${resposta.status()}.`);
  const corpo = await resposta.json().catch(() => null);
  if (corpo?.success !== true) {
    throw new Error(`A exclusão não confirmou sucesso no corpo da resposta: ${JSON.stringify(corpo)?.slice(0, 300)}`);
  }
  // O modal de sucesso abre depois do "Aguarde..." e some ao clicar em Ok: a espera é pelo texto, não pelo tempo.
  const sucesso = page.locator('.swal2-popup:visible').filter({ hasText: 'O planejamento foi removido.' });
  await expect(sucesso).toBeVisible({ timeout: 30000 });
  await expect(sucesso).toContainText('Sucesso!');
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden({ timeout: 30000 });
}

/** Exclui o planejamento do período informado e confere que ele saiu da grade. */
export async function excluirPlanejamentoEscola(page: Page, filtro: FiltroPlanejamentoEscola, periodo: string): Promise<void> {
  exigirTipoQAAuto(filtro.tipoPlanejamento);
  await navegarParaPlanejamentoEscola(page);
  await pesquisarPlanejamentos(page, filtro);
  await expect(linhaPlanejamento(page, periodo), `Não há planejamento do período "${periodo}" na grade.`).toHaveCount(1);
  await excluirLinhaAtual(page, periodo);
  await pesquisarPlanejamentos(page, filtro);
  await expect(linhaPlanejamento(page, periodo)).toHaveCount(0);
}

/** Exclui todos os planejamentos da turma e do tipo QAAUTO informados. Retorna os períodos removidos. */
export async function excluirPlanejamentosEscolaQAAuto(page: Page, filtro: FiltroPlanejamentoEscola): Promise<string[]> {
  exigirTipoQAAuto(filtro.tipoPlanejamento);
  await navegarParaPlanejamentoEscola(page);
  await pesquisarPlanejamentos(page, filtro);
  const removidos: string[] = [];
  const linhas = page.locator('#main #tabela_planejamentos tbody tr').filter({ has: page.getByTitle('Deletar elaboração') });
  // Limite = linhas encontradas na busca: sem isso, uma exclusão que não persiste reexclui para sempre.
  const totalInicial = await linhas.count();
  for (let indice = 0; indice < totalInicial; indice++) {
    const quantidade = await linhas.count();
    if (quantidade === 0) break;
    const periodo = (await linhas.first().locator('td').first().innerText()).trim();
    await excluirLinhaAtual(page, periodo);
    removidos.push(periodo);
    await pesquisarPlanejamentos(page, filtro);
    const restantes = await linhas.count();
    if (restantes >= quantidade) {
      throw new Error(`A exclusão do planejamento "${periodo}" não reduziu a grade (${quantidade} antes, ${restantes} depois).`);
    }
  }
  return removidos;
}
