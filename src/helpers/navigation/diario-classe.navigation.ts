import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';
import { celulaDescricaoTurma, linhaTurma, pesquisarTurma } from './turma.navigation';

/** Grade do Diário de Classe (alunos x dias letivos). */
export function gradeDiarioClasse(page: Page): Locator {
  return page.locator('#gridFrequencia');
}

/** Abre Escola > Turma > turma > Frequência > Diário de Classe. */
export async function abrirDiarioDeClasse(page: Page, turma: string): Promise<void> {
  await pesquisarTurma(page, turma);
  const linha = linhaTurma(page, turma);
  await expect(linha, `Turma "${turma}" ausente ou ambígua na consulta.`).toHaveCount(1);
  await celulaDescricaoTurma(linha, turma).click();

  const main = page.locator('#main');
  await expect(main.getByText(/Editar Turma/)).toBeVisible();
  await waitForSgeLoaders(page);
  const frequencia = main.getByText('Frequência', { exact: true }).filter({ visible: true });
  await expect(frequencia).toHaveCount(1);
  await frequencia.click();
  const diario = getByRoleSge(main, 'link', { name: 'Diário de Classe', exact: true });
  await expect(diario).toBeVisible();
  await diario.click();
  await expect(main.getByText('Diário de Classe', { exact: true }).first()).toBeVisible();
  await expect(main.locator('#btnGerar')).toBeVisible();
  await waitForSgeLoaders(page);
}

/** Informa o período e gera a grade (consulta; não grava frequência). Devolve as datas letivas exibidas. */
export async function gerarDiarioClasse(page: Page, dataInicial: string, dataFinal: string): Promise<string[]> {
  const main = page.locator('#main');
  for (const [id, valor] of [['DataInicial', dataInicial], ['DataFinal', dataFinal]] as const) {
    const campo = main.locator(`#${id}`);
    await campo.fill(valor);
    await campo.press('Tab');
    await expect(campo).toHaveValue(valor);
  }
  const grade = gradeDiarioClasse(page);
  // Marca a grade atual para saber quando a nova substituir a anterior.
  if (await grade.count()) await grade.evaluate((el) => el.setAttribute('data-qaauto-obsoleta', '1'));
  await main.locator('#btnGerar').click();
  await expect(grade.locator('th.cabecalhoMes').first()).toBeVisible({ timeout: 30000 });
  await expect(page.locator('#gridFrequencia[data-qaauto-obsoleta]')).toHaveCount(0);
  await waitForSgeLoaders(page);
  const datas = await grade.locator('th.cabecalhoMes').evaluateAll((ths) => ths.map((th) => th.getAttribute('title') ?? ''));
  return datas.filter(Boolean);
}

/** Célula (aluno x dia) da grade. */
export function celulaFrequencia(page: Page, aluno: string, data: string): Locator {
  const nome = aluno.replace(/"/g, '\\"');
  return gradeDiarioClasse(page).locator(`td.cellFrequencia[data-aluno="${nome}"][data-datahorariodif="${data}"]`);
}
