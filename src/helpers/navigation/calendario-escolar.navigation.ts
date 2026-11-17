import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';
export const linhaCalendarioEscolar = (page: Page, descricao: string) =>
  page
    .locator('#main table tbody tr:visible')
    .filter({ has: getByRoleSge(page, 'cell', { name: descricao, exact: true }) });
export const gridComposicaoCalendario = (page: Page) =>
  page.locator('#main #gridComposicaoCalenedario');
export const linhasComposicaoCalendario = (page: Page) =>
  page.locator('#main #gridComposicaoCalenedario tbody tr:visible');
export async function abrirAbaComposicaoEnsino(page: Page): Promise<void> {
  const m = page.locator('#main'),
    aba = m.getByRole('link', { name: 'Composição de Ensino', exact: true });
  await expect(aba).toBeVisible();
  const painel = m.locator('#s1');
  if (!(await painel.isVisible())) await aba.click();
  await expect(painel).toBeVisible();
}
/**
 * O SGE usa modais de aviso ("Calendário escolar não encontrado.") que bloqueiam o menu.
 * Fecha o aviso visível sem tocar nas confirmações de exclusão (Não/Sim).
 */
async function fecharAvisoVisivel(page: Page): Promise<void> {
  const aviso = page.locator('.swal2-popup:visible, .MessageBoxContainer:visible');
  if ((await aviso.count()) === 0) return;
  const ultimo = aviso.last();
  const ok = ultimo
    .locator('.swal2-confirm, button')
    .filter({ hasText: /^\s*Ok\s*$/i })
    .first();
  if (!(await ok.isVisible().catch(() => false))) return;
  await ok.click();
  await expect(ultimo).toBeHidden({ timeout: 5000 });
}
export async function consultaCalendarioEscolar(page: Page): Promise<void> {
  const m = page.locator('#main'),
    titulo = m.locator('h4').filter({ hasText: 'Consulta de Calendário Escolar' });
  if (await titulo.isVisible()) return;
  const n = page.locator('nav'),
    ensino = n.locator('a:visible').filter({ hasText: /^\s*Ensino\s*$/ }).first(),
    destino = n
      .locator('a[onclick*="\'/calendarioescolar\'"]')
      .filter({ hasText: /^\s*Calendário Escolar\s*$/ });
  let ultimoErro: unknown;
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    await fecharAvisoVisivel(page);
    if (!(await ensino.isVisible())) await page.getByTitle('Mostar/Esconder Menu').click();
    if (!(await destino.isVisible())) await ensino.click();
    try {
      const [r] = await Promise.all([
        page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname.toLowerCase() === '/calendarioescolar' &&
            r.request().method() === 'GET',
          { timeout: 15000 },
        ),
        destino.click(),
      ]);
      if (!r.ok()) throw new Error(`Consulta de calendário retornou HTTP ${r.status()}.`);
      await expect(titulo).toBeVisible();
      await waitForSgeLoaders(page);
      return;
    } catch (erro) {
      ultimoErro = erro;
    }
  }
  throw ultimoErro instanceof Error ? ultimoErro : new Error(String(ultimoErro));
}
export async function abrirCalendarioEscolar(
  page: Page,
  descricao: string,
): Promise<string> {
  await consultaCalendarioEscolar(page);
  const linha = linhaCalendarioEscolar(page, descricao);
  await expect(linha).toHaveCount(1);
  const rota = await linha.locator('input[name="url"]').inputValue();
  const id = rota.match(/\/editar\/(\d+)$/i)?.[1];
  if (!id) throw new Error(`Não foi possível identificar o calendário "${descricao}" na grade.`);
  const [r] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /^\/calendarioescolar\/editar\/\d+$/i.test(new URL(r.url()).pathname) &&
        r.request().method() === 'GET',
      { timeout: 30000 },
    ),
    linha.click(),
  ]);
  if (!r.ok()) throw new Error(`A edição do calendário retornou HTTP ${r.status()}.`);
  await expect(page.locator('#main #Descricao')).toHaveValue(descricao);
  await waitForSgeLoaders(page);
  return id;
}
export async function pesquisarCalendarioEscolar(page: Page, nome: string): Promise<void> {
  await consultaCalendarioEscolar(page);
  const m = page.locator('#main');
  await m.locator('#searchTerm').fill(nome);
  const [r] = await Promise.all([
    page.waitForResponse(
      (r) => {
        const u = new URL(r.url());
        return (
          u.pathname.toLowerCase() === '/calendarioescolar/indexgrid' &&
          u.searchParams.get('searchTerm') === nome &&
          r.request().method() === 'GET'
        );
      },
      { timeout: 20000 },
    ),
    m.locator('#btnSubmitSearch').click(),
  ]);
  if (!r.ok()) throw new Error(`Pesquisa retornou HTTP ${r.status()}.`);
  await waitForSgeLoaders(page);
}
