import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';
import { navegarParaAdicionarTurma, navegarParaConsultaTurmas } from './turma.navigation';

const ROTA_CONSULTA = /\/turma\/index(?:grid)?$/i;

function main(page: Page): Locator {
  return page.locator('#main');
}

export async function navegarParaConsultaTurmaAee(page: Page): Promise<void> {
  await navegarParaConsultaTurmas(page);
  const conteudo = main(page);
  await expect(getByRoleSge(conteudo, 'heading', { name: /Consulta de Turmas/i })).toBeVisible();
  await expect(conteudo.locator('#searchTerm')).toBeVisible();
  await waitForSgeLoaders(page);
}

export async function navegarParaAdicionarTurmaAee(page: Page): Promise<void> {
  await navegarParaAdicionarTurma(page, 'AEE');
  await expect(getByRoleSge(main(page), 'heading', { name: /Criar Turma de AEE/i })).toBeVisible();
  await expect(main(page).locator('#formCreateTurmaAEE')).toBeVisible();
}

export async function pesquisarTurmaAee(page: Page, termo: string): Promise<void> {
  const busca = main(page).locator('#searchTerm');
  const pesquisar = main(page).locator('#btnSubmitSearch');
  await navegarParaConsultaTurmaAee(page);
  await busca.fill(termo);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return ROTA_CONSULTA.test(url.pathname)
        && url.searchParams.get('searchTerm') === termo
        && response.request().method() === 'GET';
    }, { timeout: 20000 }),
    pesquisar.click(),
  ]);

  if (!resposta.ok()) throw new Error(`A consulta de Turmas AEE retornou HTTP ${resposta.status()}.`);
  await waitForSgeLoaders(page);
  await expect(main(page).locator('table')).toBeVisible();
}

export function linhaTurmaAee(page: Page, descricao: string): Locator {
  const descricaoExata = new RegExp(`^\\s*${escapeRegex(descricao.trim())}\\s*$`, 'i');
  const textoDescricao = page.getByText(descricaoExata).filter({ visible: true });
  return main(page).locator('table tbody tr:visible').filter({ has: textoDescricao });
}

export function celulaDescricaoTurmaAee(linha: Locator, descricao: string): Locator {
  return linha.getByText(new RegExp(`^\\s*${escapeRegex(descricao.trim())}\\s*$`, 'i')).filter({ visible: true });
}

function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
