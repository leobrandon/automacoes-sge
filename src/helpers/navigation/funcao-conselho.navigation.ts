import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { aguardarCarregamentoConselho } from './conselho-escolar.navigation';

const ROTA_FUNCAO = '/funcaoconselhoescolar';

function main(page: Page): Locator {
  return page.locator('#main');
}

/**
 * Navega pelo menu visível Escola > Conselho Escolar > Função. A Função só é gerenciada na
 * visão Secretaria de Educação (perfil padrão após o login).
 */
export async function navegarParaFuncaoConselho(page: Page): Promise<void> {
  await expect(
    page.locator('header').getByText('Secretaria de Educação', { exact: true }),
    'A Função do Conselho Escolar só é gerenciada na visão Secretaria de Educação.',
  ).toBeVisible({ timeout: 15000 });

  const nav = page.locator('nav');
  // O nome acessível dos itens do menu começa com um glifo de ícone, por isso \W*.
  const escola = nav.getByRole('link', { name: /^\W*Escola\W*$/ });
  const conselhoEscolar = nav.getByRole('link', { name: /^\W*Conselho Escolar\W*$/ });
  const destino = nav.locator(`a[onclick="CarregarPaginaAjaxIgnorandoVisaoProfessor('${ROTA_FUNCAO}')"]`);

  await aguardarCarregamentoConselho(page);
  if (!await destino.isVisible()) {
    if (!await conselhoEscolar.isVisible()) {
      await escola.waitFor({ state: 'visible', timeout: 15000 });
      await escola.click();
    }
    await conselhoEscolar.waitFor({ state: 'visible', timeout: 15000 });
    await conselhoEscolar.click();
  }

  await destino.waitFor({ state: 'visible', timeout: 15000 });
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho.startsWith(ROTA_FUNCAO) && response.request().method() === 'GET';
    }, { timeout: 30000 }),
    destino.click(),
  ]);
  if (!resposta.ok()) throw new Error(`A tela de Funções do Conselho Escolar retornou HTTP ${resposta.status()}.`);

  await aguardarCarregamentoConselho(page);
  await main(page).locator('h4').filter({ hasText: 'Funções do Conselho Escolar' }).waitFor({ state: 'visible', timeout: 30000 });
  await main(page).locator('#searchTerm').waitFor({ state: 'visible', timeout: 20000 });
  await getByRoleSge(main(page), 'button', { name: /Adicionar/ }).waitFor({ state: 'visible', timeout: 15000 });
}

export async function pesquisarFuncaoConselho(page: Page, termo: string): Promise<void> {
  await navegarParaFuncaoConselho(page);
  const busca = main(page).locator('#searchTerm');
  await busca.fill(termo);
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLowerCase().replace(/\/$/, '') === `${ROTA_FUNCAO}/indexgrid`
        && url.searchParams.get('searchTerm') === termo
        && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    main(page).locator('#btn-search').click(),
  ]);
  if (!resposta.ok()) throw new Error(`A pesquisa de Funções do Conselho Escolar retornou HTTP ${resposta.status()}.`);
  await aguardarCarregamentoConselho(page);
}

/** Linhas da grade cuja coluna "Função no Conselho" é exatamente `descricao`. */
export function linhaFuncaoConselho(page: Page, descricao: string): Locator {
  return main(page).locator('table tbody tr').filter({
    has: getByRoleSge(page, 'cell', { name: descricao, exact: true }),
  });
}

export function modalFuncaoConselho(page: Page): Locator {
  return page.locator('.modal:visible').filter({ has: page.locator('#IdadeMinima') });
}

export async function abrirModalNovaFuncaoConselho(page: Page): Promise<Locator> {
  await navegarParaFuncaoConselho(page);
  await getByRoleSge(main(page), 'button', { name: /Adicionar/ }).click();
  const modal = modalFuncaoConselho(page);
  await expect(modal.locator('#Descricao')).toBeVisible({ timeout: 15000 });
  return modal;
}
