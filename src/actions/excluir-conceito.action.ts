import { expect, type Page } from '@playwright/test';
import { isConceitoQAAuto } from '../factories/conceito.factory';
import {
  aguardarCarregamentoConceito,
  linhaConceito,
  pesquisarConceito,
} from '../helpers/navigation/conceito.navigation';

export interface ConceitoExcluido {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoConceito {
  totalEncontrados: number;
  totalExcluidos: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

/** Exclui somente um Conceito QAAUTO encontrado por descrição exata e única. */
export async function excluirConceito(page: Page, descricao: string): Promise<ConceitoExcluido> {
  const alvo = descricao.trim();
  if (!isConceitoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada requer a descrição exata QAAUTO com sufixo numérico.');
  }

  await pesquisarConceito(page, alvo);
  const linha = linhaConceito(page, alvo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha.getByRole('cell', { name: alvo, exact: true, includeHidden: true })).toBeVisible();
  await linha.getByRole('cell', { name: alvo, exact: true, includeHidden: true }).click();

  const formulario = page.locator('#main');
  await formulario.getByRole('heading', { name: /Editar Conceito/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 15000 });
  const descricaoEditada = (await formulario.locator('#Descricao').inputValue()).trim();
  if (descricaoEditada !== alvo) {
    throw new Error(`O formulário aberto pertence a "${descricaoEditada}", não a "${alvo}".`);
  }

  await formulario.getByRole('button', { name: /Excluir/i, includeHidden: true }).click();
  const confirmacao = page.getByText('Tem certeza que deseja excluir?', { exact: true });
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Sim', exact: true }).click();

  const mensagemSucesso = page.getByText('Conceito excluído com sucesso!', { exact: true });
  await expect(mensagemSucesso).toBeVisible({ timeout: 20000 });
  const alertaSucesso = page.locator(
    '.swal2-popup:visible, .sweet-alert:visible, .divMessageBox:visible, .MessageBoxContainer:visible, [role="dialog"]:visible',
  ).filter({ has: mensagemSucesso }).last();
  const ok = alertaSucesso.getByRole('button', { name: /^(Ok|OK|Fechar)$/i }).first();
  if (await ok.isVisible().catch(() => false)) await ok.click();

  await aguardarCarregamentoConceito(page);
  await formulario.getByRole('heading', { name: /Consulta de Conceitos/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 20000 });
  await pesquisarConceito(page, alvo);
  await expect(linhaConceito(page, alvo)).toHaveCount(0, { timeout: 15000 });
  return { descricao: alvo, url: page.url() };
}

/** Exclui, pela grade visível, somente Conceitos cujo nome começa com QAAUTO. */
export async function excluirConceitosQAAutoEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoConceito> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote de Conceitos aceita somente o termo "QAAUTO".');
  }
  const resultado: ResultadoLoteExclusaoConceito = {
    totalEncontrados: 0,
    totalExcluidos: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentados = new Set<string>();
  await pesquisarConceito(page, 'QAAUTO');

  while (true) {
    const linhas = page.locator('#main table tbody tr:visible');
    let descricaoPendente: string | undefined;
    for (let i = 0; i < await linhas.count(); i++) {
      const celulas = linhas.nth(i).locator('td');
      let descricao = '';
      for (let j = 0; j < await celulas.count(); j++) {
        const texto = (await celulas.nth(j).innerText().catch(() => '')).trim();
        if (/^QAAUTO\b/i.test(texto)) { descricao = texto; break; }
      }
      if (/^QAAUTO\b/i.test(descricao) && !tentados.has(descricao)) {
        descricaoPendente = descricao;
        break;
      }
    }

    if (descricaoPendente) {
      tentados.add(descricaoPendente);
      resultado.totalEncontrados++;
      try {
        await excluirConceito(page, descricaoPendente);
        resultado.descricoesExcluidas.push(descricaoPendente);
      } catch (erro) {
        resultado.falhas.push({
          descricao: descricaoPendente,
          motivo: erro instanceof Error ? erro.message : String(erro),
        });
      }
      await pesquisarConceito(page, 'QAAUTO');
      continue;
    }

    const proxima = page.locator('#main a:visible').filter({ hasText: /^\s*Próxima\s*$/ }).first();
    if (!await proxima.isVisible().catch(() => false)) break;
    const itemPaginacao = proxima.locator('xpath=ancestor::li[1]');
    if (await itemPaginacao.evaluate((el) => el.classList.contains('disabled'))) break;
    const antes = await linhas.first().innerText().catch(() => '');
    await proxima.click();
    await aguardarCarregamentoConceito(page);
    await expect.poll(() => linhas.first().innerText().catch(() => ''), {
      timeout: 15000,
      message: 'A grade de Conceitos não avançou para a próxima página.',
    }).not.toBe(antes);
  }

  resultado.totalExcluidos = resultado.descricoesExcluidas.length;
  return resultado;
}
