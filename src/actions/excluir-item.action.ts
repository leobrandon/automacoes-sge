import { expect, type Page } from '@playwright/test';
import { isItemQAAuto } from '../factories/item.factory';
import {
  abrirEdicaoItem,
  aguardarCarregamentoItem,
  linhaItem,
  pesquisarItem,
  tituloConsultaItem,
} from '../helpers/navigation/item.navigation';

export interface ItemExcluido {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoItem {
  totalExcluidos: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui o Item QAAUTO de descrição exata abrindo a edição e acionando #btnExcluir. */
export async function excluirItem(page: Page, descricao: string): Promise<ItemExcluido> {
  const alvo = descricao.trim();
  if (!isItemQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige uma descrição iniciada por QAAUTO.');
  }

  await pesquisarItem(page, alvo);
  const encontrados = await linhaItem(page, alvo).count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Item "${alvo}" na consulta, encontrado(s) ${encontrados}. `
      + 'Execute criar_item_action antes ou ajuste a descrição em dados_exclusao_item.json.',
    );
  }

  await abrirEdicaoItem(page, alvo);
  const excluir = page.locator('#main #btnExcluir');
  await expect(excluir).toBeVisible({ timeout: 15000 });
  await excluir.click();

  const confirmacao = page
    .locator('.swal2-popup:visible')
    .filter({ hasText: /Deseja continuar\?/i })
    .first();
  await expect(confirmacao).toBeVisible({ timeout: 15000 });

  const botaoSim = confirmacao.getByRole('button', { name: 'Sim', exact: true });
  await expect(botaoSim).toBeVisible({ timeout: 10000 });

  const [respostaExclusao] = await Promise.all([
    page.waitForResponse(
      (response) => new URL(response.url()).pathname.toLowerCase() === '/item/excluaitem'
        && response.request().method() === 'POST',
      { timeout: 30000 },
    ),
    botaoSim.click(),
  ]);
  if (!respostaExclusao.ok()) {
    throw new Error(`A exclusão de Item retornou HTTP ${respostaExclusao.status()}.`);
  }

  const retornoExclusao = (await respostaExclusao.json()) as { success?: boolean; sucesso?: boolean; message?: string };
  if (!(retornoExclusao.success ?? retornoExclusao.sucesso)) {
    throw new Error(`O SGE recusou a exclusão do Item "${alvo}": ${retornoExclusao.message ?? JSON.stringify(retornoExclusao)}`);
  }

  const sucesso = page
    .locator('.swal2-popup:visible')
    .filter({ hasNotText: 'Aguarde' })
    .filter({ has: page.getByRole('button', { name: 'Ok', exact: true }) })
    .first();
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  const mensagemSucesso = (await sucesso.innerText()).replace(/\s+/g, ' ').trim();
  if (!/sucesso|item removido/i.test(mensagemSucesso)) {
    throw new Error(`A confirmação após excluir "${alvo}" foi inesperada: ${mensagemSucesso}`);
  }
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden({ timeout: 15000 });

  await aguardarCarregamentoItem(page);
  await expect(tituloConsultaItem(page)).toBeVisible({ timeout: 20000 });

  await pesquisarItem(page, alvo);
  await expect(linhaItem(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Item excluído e ausência conferida: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}

/** Percorre repetidamente a busca QAAUTO e exclui apenas itens iniciados por QAAUTO. */
export async function excluirItensEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoItem> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoItem = {
    totalExcluidos: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();

  while (true) {
    await pesquisarItem(page, 'QAAUTO');
    const celulasDescricao = page.locator('#main #grid table tbody tr td:nth-child(3)');
    const descricoes = (await celulasDescricao.allInnerTexts()).map((texto) => texto.trim());
    const proxima = descricoes.find(
      (descricao) => isItemQAAuto(descricao) && !tentadas.has(descricao),
    );
    if (!proxima) break;

    tentadas.add(proxima);
    try {
      await excluirItem(page, proxima);
      resultado.descricoesExcluidas.push(proxima);
    } catch (erro) {
      resultado.falhas.push({
        descricao: proxima,
        motivo: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  resultado.totalExcluidos = resultado.descricoesExcluidas.length;
  return resultado;
}
