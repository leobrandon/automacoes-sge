import { expect, type Locator, type Page } from '@playwright/test';
import { isVeiculoQAAuto } from '../factories/veiculo.factory';
import {
  abrirEdicaoVeiculo,
  confirmarExclusaoVeiculo,
  linhaVeiculo,
  pesquisarVeiculo,
  tituloConsultaVeiculo,
} from '../helpers/navigation/veiculo.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface VeiculoExcluido {
  modelo: string;
  url: string;
}

export interface ResultadoLoteExclusaoVeiculo {
  totalExcluidos: number;
  modelosExcluidos: string[];
  falhas: Array<{ modelo: string; motivo: string }>;
}

/** Exclui somente o Veículo QAAUTO de modelo exato, abrindo-o pela grade e usando "Excluir". */
export async function excluirVeiculo(page: Page, modelo: string): Promise<VeiculoExcluido> {
  const alvo = modelo.trim();
  if (!isVeiculoQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige o modelo/descrição exato de um Veículo QAAUTO.');
  }

  await pesquisarVeiculo(page, alvo);
  const encontrados = await linhaVeiculo(page, alvo).count();
  if (encontrados !== 1) {
    throw new Error(
      `Esperado 1 Veículo "${alvo}" na consulta, encontrado ${encontrados}. `
      + 'Execute criar_veiculo_action antes, ajuste o modelo em dados_exclusao_veiculo.json '
      + 'ou remova a duplicidade manualmente.',
    );
  }

  await abrirEdicaoVeiculo(page, alvo);
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();
  await confirmarExclusaoVeiculo(page);

  await expect(page.getByText('Veículo excluido com sucesso!', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(tituloConsultaVeiculo(page)).toBeVisible({ timeout: 20000 });
  await pesquisarVeiculo(page, alvo);
  await expect(linhaVeiculo(page, alvo)).toHaveCount(0, { timeout: 15000 });

  console.log(`[QAAUTO] Veículo excluído e ausência conferida: ${alvo}`);
  return { modelo: alvo, url: page.url() };
}

function celulasModelo(page: Page): Locator {
  return page.locator('#main #grid table tbody tr td:nth-child(3)');
}

/**
 * Percorre a primeira página da pesquisa QAAUTO repetidamente e remove só modelos iniciados por
 * QAAUTO. Itens que falharem não são reprocessados.
 */
export async function excluirVeiculosEmLote(
  page: Page,
  termo = 'QAAUTO',
): Promise<ResultadoLoteExclusaoVeiculo> {
  if (termo.trim().toLocaleUpperCase('pt-BR') !== 'QAAUTO') {
    throw new Error('A exclusão em lote aceita somente o termo QAAUTO.');
  }

  const resultado: ResultadoLoteExclusaoVeiculo = {
    totalExcluidos: 0,
    modelosExcluidos: [],
    falhas: [],
  };
  const tentados = new Set<string>();

  while (true) {
    await pesquisarVeiculo(page, 'QAAUTO');
    const modelos = (await celulasModelo(page).allInnerTexts()).map((texto) => texto.trim());
    const proximo = modelos.find((modelo) => isVeiculoQAAuto(modelo) && !tentados.has(modelo));
    if (!proximo) break;

    tentados.add(proximo);
    try {
      await excluirVeiculo(page, proximo);
      resultado.modelosExcluidos.push(proximo);
    } catch (erro) {
      resultado.falhas.push({
        modelo: proximo,
        motivo: erro instanceof Error ? erro.message : String(erro),
      });
    }
  }

  resultado.totalExcluidos = resultado.modelosExcluidos.length;
  return resultado;
}
