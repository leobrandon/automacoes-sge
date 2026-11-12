import { expect, type Locator, type Page } from '@playwright/test';
import { isAtividadeAeeQAAuto } from '../factories/atividade-aee.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  confirmarExclusaoAee,
  linhaAtividadeAee,
  pesquisarAtividadeAee,
} from '../helpers/navigation/atividade-aee.navigation';

export interface AtividadeAeeExcluida {
  descricao: string;
  url: string;
}

export interface ResultadoLoteExclusaoAtividadeAee {
  totalExcluidas: number;
  descricoesExcluidas: string[];
  falhas: Array<{ descricao: string; motivo: string }>;
}

function celulaDescricao(linha: Locator): Locator {
  return getByRoleSge(linha, 'cell').first();
}

/** Exclui uma linha QAAUTO exata pelo ícone de lixeira da grade. */
export async function excluirAtividadeAee(page: Page, descricao: string): Promise<AtividadeAeeExcluida> {
  const alvo = descricao.trim();
  if (!isAtividadeAeeQAAuto(alvo)) {
    throw new Error('A exclusão automatizada requer uma descrição iniciada por QAAUTO.');
  }

  await pesquisarAtividadeAee(page, alvo);
  const linha = linhaAtividadeAee(page, alvo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(celulaDescricao(linha)).toHaveText(alvo);
  const lixeira = getByRoleSge(linha, 'link', { name: '', exact: true });
  await expect(lixeira).toBeVisible();
  await lixeira.click();
  await confirmarExclusaoAee(page);

  await pesquisarAtividadeAee(page, alvo);
  await expect(linha).toHaveCount(0, { timeout: 15000 });
  return { descricao: alvo, url: page.url() };
}

/** Percorre a grade pela interface e remove apenas descrições iniciadas por QAAUTO. */
export async function excluirAtividadesAeeEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoAtividadeAee> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoAtividadeAee = {
    totalExcluidas: 0,
    descricoesExcluidas: [],
    falhas: [],
  };
  const tentadas = new Set<string>();
  await pesquisarAtividadeAee(page, 'QAAUTO');

  while (true) {
    const linhas = page.locator('#main table tbody tr:visible');
    let proximaDescricao: string | undefined;

    for (let indice = 0; indice < await linhas.count(); indice++) {
      const descricao = (await getByRoleSge(linhas.nth(indice), 'cell').first().innerText()).trim();
      if (isAtividadeAeeQAAuto(descricao) && !tentadas.has(descricao)) {
        proximaDescricao = descricao;
        break;
      }
    }

    if (proximaDescricao) {
      tentadas.add(proximaDescricao);
      try {
        await excluirAtividadeAee(page, proximaDescricao);
        resultado.descricoesExcluidas.push(proximaDescricao);
      } catch (erro) {
        resultado.falhas.push({
          descricao: proximaDescricao,
          motivo: erro instanceof Error ? erro.message : String(erro),
        });
      }
      await pesquisarAtividadeAee(page, 'QAAUTO');
      continue;
    }

    const proxima = getByRoleSge(page.locator('#main'), 'link', { name: 'Próxima', exact: true });
    if (!await proxima.isVisible().catch(() => false)) break;
    const itemPaginacao = proxima.locator('xpath=ancestor::li[1]');
    if (await itemPaginacao.evaluate((elemento) => elemento.classList.contains('disabled'))) break;

    const primeiraLinha = linhas.first();
    const antes = await primeiraLinha.innerText().catch(() => '');
    await proxima.click();
    await expect.poll(async () => linhas.first().innerText().catch(() => ''), {
      timeout: 15000,
      message: 'A grade de Atividades de AEE não avançou para a próxima página.',
    }).not.toBe(antes);
  }

  resultado.totalExcluidas = resultado.descricoesExcluidas.length;
  return resultado;
}
