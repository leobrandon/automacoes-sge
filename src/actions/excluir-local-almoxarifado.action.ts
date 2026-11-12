import { expect, type Locator, type Page } from '@playwright/test';
import { isLocalAlmoxarifadoQAAuto } from '../factories/local-almoxarifado.factory';
import {
  abrirEdicaoLocalAlmoxarifado,
  confirmarExclusaoLocalAlmoxarifado,
  linhaLocalAlmoxarifado,
  pesquisarLocalAlmoxarifado,
  tituloConsultaLocalAlmoxarifado,
} from '../helpers/navigation/local-almoxarifado.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface LocalAlmoxarifadoExcluido {
  nome: string;
  url: string;
}

export interface ResultadoLoteExclusaoLocalAlmoxarifado {
  totalExcluidos: number;
  nomesExcluidos: string[];
  falhas: Array<{ nome: string; motivo: string }>;
}

/** Exclui somente o Local QAAUTO de nome exato, abrindo-o pela grade e usando "Excluir". */
export async function excluirLocalAlmoxarifado(page: Page, nome: string): Promise<LocalAlmoxarifadoExcluido> {
  const alvo = nome.trim();
  if (!isLocalAlmoxarifadoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige o nome exato de um Local QAAUTO.');
  }

  await pesquisarLocalAlmoxarifado(page, alvo);
  const encontrados = await linhaLocalAlmoxarifado(page, alvo).count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Local "${alvo}" na consulta, encontrado ${encontrados}. `
      + 'Execute criar_local_almoxarifado_action antes, ajuste o nome em dados_exclusao_local_almoxarifado.json '
      + 'ou remova a duplicidade manualmente.',
    );
  }

  await abrirEdicaoLocalAlmoxarifado(page, alvo);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusaoLocalAlmoxarifado(page);

  const sucesso = page.getByText('Local excluído!', { exact: true });
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden();
  await expect(tituloConsultaLocalAlmoxarifado(page)).toBeVisible({ timeout: 20000 });
  await pesquisarLocalAlmoxarifado(page, alvo);
  await expect(linhaLocalAlmoxarifado(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Local excluído e ausência conferida: ${alvo}`);
  return { nome: alvo, url: page.url() };
}

function celulasNome(page: Page): Locator {
  return page.locator('#main #grid table tbody tr td:nth-child(2)');
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e remove só nomes iniciados por
 * QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirLocaisAlmoxarifadoEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoLocalAlmoxarifado> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoLocalAlmoxarifado = {
    totalExcluidos: 0,
    nomesExcluidos: [],
    falhas: [],
  };
  const tentados = new Set<string>();

  while (true) {
    await pesquisarLocalAlmoxarifado(page, 'QAAUTO');
    const nomes = (await celulasNome(page).allInnerTexts()).map((texto) => texto.trim());
    const proximo = nomes.find((nome) => isLocalAlmoxarifadoQAAuto(nome) && !tentados.has(nome));
    if (!proximo) break;

    tentados.add(proximo);
    try {
      await excluirLocalAlmoxarifado(page, proximo);
      resultado.nomesExcluidos.push(proximo);
    } catch (erro) {
      resultado.falhas.push({
        nome: proximo,
        motivo: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  resultado.totalExcluidos = resultado.nomesExcluidos.length;
  return resultado;
}
