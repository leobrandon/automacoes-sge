import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const CONSULTA_MEDICAMENTO = /Medicamentos/i;
const ROTA_MEDICAMENTO = '/medicamento';

function main(page: Page): Locator {
  return page.locator('#main');
}

export async function aguardarCarregamentoMedicamento(page: Page): Promise<void> {
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
  await waitForSgeLoaders(page);
}

/** Navega pelos menus visíveis Cadastro > Ficha Médica > Medicamentos. */
export async function navegarParaConsultaMedicamento(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = conteudo.locator('h4').filter({ hasText: CONSULTA_MEDICAMENTO });
  const tabela = conteudo.locator('table');
  const busca = conteudo.locator('#searchTerm');

  await aguardarCarregamentoMedicamento(page);
  if (await titulo.isVisible().catch(() => false)) {
    await tabela.waitFor({ state: 'visible', timeout: 20000 });
    await busca.waitFor({ state: 'visible', timeout: 20000 });
    return;
  }

  const nav = page.locator('nav');
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemCadastro = nav.getByRole('listitem')
    .filter({ has: getByRoleSge(page, 'link', { name: /^Ficha Médica/ }) })
    .first();
  const cadastro = itemCadastro.getByRole('link', { name: /Cadastro/ }).first();
  const fichaMedica = itemCadastro.getByRole('link', { name: /^Ficha Médica/ }).first();
  const destino = itemCadastro.getByRole('link', { name: 'Medicamentos', exact: true });

  if (!await destino.isVisible().catch(() => false)) {
    if (!await fichaMedica.isVisible().catch(() => false)) {
      await cadastro.waitFor({ state: 'visible', timeout: 15000 });
      await cadastro.click();
    }
    await fichaMedica.waitFor({ state: 'visible', timeout: 15000 });
    if (!await destino.isVisible().catch(() => false)) await fichaMedica.click();
  }

  await destino.waitFor({ state: 'visible', timeout: 15000 });
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === ROTA_MEDICAMENTO && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A consulta de Medicamentos retornou HTTP ${resposta.status()}.`);

  await titulo.waitFor({ state: 'visible', timeout: 30000 });
  await aguardarCarregamentoMedicamento(page);
  await tabela.waitFor({ state: 'visible', timeout: 20000 });
  await busca.waitFor({ state: 'visible', timeout: 20000 });
}

export async function navegarParaAdicionarMedicamento(page: Page): Promise<void> {
  await navegarParaConsultaMedicamento(page);
  // O modal oculto também tem um botão "Adicionar" dentro de #main; o id é único.
  await main(page).locator('#btnAddMedicamento').click();
  await page.locator('#modalMedicamento #Descricao').waitFor({ state: 'visible', timeout: 15000 });
}

/** Linha da grade cuja célula de descrição é exatamente a informada. */
export function linhaMedicamento(page: Page, descricao: string): Locator {
  return main(page).locator('table tbody tr:visible').filter({
    has: getByRoleSge(page, 'cell', { name: descricao, exact: true }),
  });
}

export async function pesquisarMedicamento(page: Page, termo: string): Promise<void> {
  await navegarParaConsultaMedicamento(page);
  await main(page).locator('#searchTerm').fill(termo);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase().replace(/\/$/, '') === `${ROTA_MEDICAMENTO}/indexgrid`
        && url.searchParams.get('searchTerm') === termo
        && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    main(page).locator('#searchForm button[type="submit"]').click(),
  ]);
  if (!resposta.ok()) throw new Error(`A pesquisa de Medicamentos retornou HTTP ${resposta.status()}.`);

  await aguardarCarregamentoMedicamento(page);
  await main(page).locator('table').waitFor({ state: 'visible', timeout: 15000 });
}

/** Aviso do SGE (swal2) com um único botão de confirmação. */
export async function confirmarAvisoMedicamento(page: Page, texto: RegExp): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: texto });
  await expect(dialog).toBeVisible({ timeout: 20000 });
  await dialog.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(dialog).toBeHidden({ timeout: 15000 });
}

export async function confirmarExclusaoMedicamento(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog').filter({ hasText: /Tem certeza que deseja remover o medicamento\?/i });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  await dialog.getByRole('button', { name: 'Sim', exact: true }).click();
  await confirmarAvisoMedicamento(page, /Medicamento removido/i);
}
