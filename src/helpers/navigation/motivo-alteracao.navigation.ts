import { Page, Locator } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

/** Visão de Secretaria da Educação; navegação exclusivamente pelos menus visíveis. */
export async function navegarParaConsultaMotivoAlteracao(page: Page): Promise<void> {
  const formulario = page.locator('.modal:visible').filter({ has: page.locator('#Motivo') });
  if (await formulario.count()) {
    await formulario.locator('button').filter({ hasText: /^\s*Fechar\s*$/ }).click();
    await formulario.waitFor({ state: 'hidden' });
  }
  const titulo = page.locator('h4').filter({ hasText: /^\s*Motivo de Alteração\s*$/ });
  if (await titulo.isVisible()) return;
  const nav = page.locator('nav');
  const destino = nav.locator('a').filter({ hasText: /^Motivo de Alteração$/ });
  if (!await destino.isVisible()) {
    const pai = nav.locator('a').filter({ hasText: /^\s*Alimentação Escolar\s*$/ });
    if (!await pai.isVisible()) await page.getByTitle('Mostar/Esconder Menu').click();
    const basicos = nav.locator('a').filter({ hasText: /^Cadastros Básicos$/ });
    if (!await basicos.isVisible()) await pai.click();
    if (!await destino.isVisible()) await basicos.click();
  }
  await destino.click();
  await titulo.waitFor({ state: 'visible', timeout: 20000 });
  await page.locator('#searchTerm').waitFor({ state: 'visible' });
  await waitForSgeLoaders(page);
}

export async function navegarParaAdicionarMotivoAlteracao(page: Page): Promise<void> {
  await navegarParaConsultaMotivoAlteracao(page);
  await page.locator('button').filter({ hasText: /^\s*Adicionar\s*$/ }).click();
  await page.locator('.modal:visible #Motivo').waitFor({ state: 'visible' });
}

export function linhaMotivoAlteracao(page: Page, descricao: string): Locator {
  return page.locator('table tbody tr').filter({
    has: page.locator('td').filter({ hasText: new RegExp(`^${descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }),
  });
}

export async function pesquisarMotivoAlteracao(page: Page, descricao: string): Promise<void> {
  await navegarParaConsultaMotivoAlteracao(page);
  const apenasAtivo = page.locator('#ApenasAtivo');
  if (await apenasAtivo.isChecked()) {
    const controle = page.locator('.toggle').filter({ has: apenasAtivo });
    if (!await controle.isVisible()) await page.locator('#btnFiltros').click();
    await controle.click();
    if (await apenasAtivo.isChecked()) throw new Error('Não foi possível desmarcar Apenas ativos.');
  }
  await page.locator('#searchTerm').fill(descricao);
  const gradeAnterior = await page.locator('table').elementHandle();
  // Observa a requisição disparada pelo clique; não realiza chamadas de API.
  const [resultado] = await Promise.all([
    page.waitForResponse(r => {
      const url = new URL(r.url());
      return /\/motivodealteracao\/indexgrid/i.test(url.pathname)
        && url.searchParams.get('searchTerm') === descricao
        && !url.searchParams.getAll('ApenasAtivo').includes('true')
        && r.request().method() === 'GET';
    }, { timeout: 15000 }),
    page.locator('#btnSubmitSearch').click(),
  ]);
  if (!resultado.ok()) throw new Error(`Consulta de motivos retornou HTTP ${resultado.status()}.`);
  if (gradeAnterior) {
    try { await page.waitForFunction(el => !el.isConnected, gradeAnterior, { timeout: 15000 }); }
    finally { await gradeAnterior.dispose(); }
  }
  await waitForSgeLoaders(page);
}
