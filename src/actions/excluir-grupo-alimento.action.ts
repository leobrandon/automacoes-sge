import { expect, type Page } from '@playwright/test';
import { isGrupoAlimentoQAAuto } from '../factories/grupo-alimento.factory';
import {
  confirmarExclusaoGrupoAlimento,
  linhaGrupoAlimento,
  pesquisarGrupoAlimento,
} from '../helpers/navigation/grupo-alimento.navigation';

export interface GrupoAlimentoExcluido {
  nome: string;
  url: string;
}

export interface ResultadoLoteExclusaoGrupoAlimento {
  totalExcluidos: number;
  nomesExcluidos: string[];
  falhas: Array<{ nome: string; motivo: string }>;
}

/** Exclui uma linha QAAUTO exata pela lixeira da grade. */
export async function excluirGrupoAlimento(page: Page, nome: string): Promise<GrupoAlimentoExcluido> {
  const alvo = nome.trim();
  if (!isGrupoAlimentoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada requer um nome iniciado por QAAUTO.');
  }

  await pesquisarGrupoAlimento(page, alvo);
  const linha = linhaGrupoAlimento(page, alvo);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  const lixeira = linha.getByTitle('Excluir Grupo de Alimento');
  await expect(lixeira).toBeVisible();
  await lixeira.click();
  await confirmarExclusaoGrupoAlimento(page);

  await pesquisarGrupoAlimento(page, alvo);
  await expect(linha).toHaveCount(0, { timeout: 15000 });
  return { nome: alvo, url: page.url() };
}

/** Percorre a grade filtrada por QAAUTO e remove apenas nomes iniciados por QAAUTO. */
export async function excluirGruposAlimentoEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoGrupoAlimento> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoGrupoAlimento = {
    totalExcluidos: 0,
    nomesExcluidos: [],
    falhas: [],
  };
  const tentados = new Set<string>();

  while (true) {
    await pesquisarGrupoAlimento(page, 'QAAUTO');
    const nomes = (await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts())
      .map((texto) => texto.trim());
    const proximo = nomes.find((nome) => isGrupoAlimentoQAAuto(nome) && !tentados.has(nome));
    if (!proximo) break;

    tentados.add(proximo);
    try {
      await excluirGrupoAlimento(page, proximo);
      resultado.nomesExcluidos.push(proximo);
    } catch (erro) {
      resultado.falhas.push({ nome: proximo, motivo: erro instanceof Error ? erro.message : String(erro) });
    }
  }

  resultado.totalExcluidos = resultado.nomesExcluidos.length;
  return resultado;
}
