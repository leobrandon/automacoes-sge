import { expect, type Locator, type Page } from '@playwright/test';
import {
  type TipoRegistroPedagogicoTipo,
} from '../../factories/tipo-registro-pedagogico.factory';
import { getByRoleSge } from '../sge-locators.helper';
import { waitForSgeLoaders } from './common.navigation';

const CONSULTA = /Tipos de Registros Pedagógicos/i;
const ROTA_CONSULTA = '/tipoderegistropedagogico/indexgrid';

function main(page: Page): Locator {
  return page.locator('#main');
}

async function aguardarConsulta(page: Page): Promise<void> {
  await waitForSgeLoaders(page);
  await page.locator('.swal2-popup.swal2-loading').waitFor({ state: 'hidden', timeout: 30000 });
}

/** Abre Cadastro > Ensino > Tipo de Registro Pedagógico pelos menus visíveis. */
export async function navegarParaConsultaTipoRegistroPedagogico(page: Page): Promise<void> {
  const conteudo = main(page);
  const titulo = getByRoleSge(conteudo, 'heading', { name: CONSULTA });
  const tabela = conteudo.locator('table:visible');
  const busca = conteudo.locator('#searchTerm:visible');
  await aguardarConsulta(page);

  if (await titulo.isVisible()) {
    await expect(tabela).toBeVisible({ timeout: 20000 });
    await expect(busca).toBeVisible({ timeout: 20000 });
    return;
  }

  const tituloEdicao = getByRoleSge(conteudo, 'heading', { name: /Editar Tipo de Registro Pedagógico/i });
  if (await tituloEdicao.isVisible()) {
    const voltar = getByRoleSge(conteudo, 'button', { name: /Voltar/ });
    await expect(voltar).toBeVisible();
    await voltar.click();
    await expect(titulo).toBeVisible({ timeout: 30000 });
    await aguardarConsulta(page);
    await expect(tabela).toBeVisible({ timeout: 20000 });
    await expect(busca).toBeVisible({ timeout: 20000 });
    return;
  }

  const nav = page.locator('nav:visible').first();
  const cadastro = nav.getByRole('link', { name: /Cadastro/ }).first();
  // `has` é avaliado dentro de cada <li>, por isso usa locators de página (não encadeados em `nav`).
  const itemCadastro = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /Cadastro/ }) });
  const ensino = itemCadastro.getByRole('link', { name: /^Ensino(?:\s|$)/ }).first();
  const itemEnsino = nav.getByRole('listitem').filter({ has: page.getByRole('link', { name: /^Ensino(?:\s|$)/ }) });
  const destino = itemEnsino.getByRole('link', { name: 'Tipo de Registro Pedagógico', exact: true });

  await expect(cadastro).toBeVisible({ timeout: 15000 });
  if (!await ensino.isVisible()) await cadastro.click();
  await expect(ensino).toBeVisible({ timeout: 15000 });
  if (!await destino.isVisible()) await ensino.click();
  await expect(destino).toBeVisible({ timeout: 15000 });
  await destino.click();

  await expect(titulo).toBeVisible({ timeout: 30000 });
  await aguardarConsulta(page);
  await expect(tabela).toBeVisible({ timeout: 20000 });
  await expect(busca).toBeVisible({ timeout: 20000 });
}

export async function navegarParaAdicionarTipoRegistroPedagogico(
  page: Page,
  tipo: TipoRegistroPedagogicoTipo,
): Promise<void> {
  await navegarParaConsultaTipoRegistroPedagogico(page);
  const conteudo = main(page);
  const adicionar = getByRoleSge(conteudo, 'button', { name: /Adicionar/i });
  await expect(adicionar).toBeVisible();
  await adicionar.click();

  const textoTipo = tipo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const opcao = getByRoleSge(conteudo, 'link', { name: new RegExp(textoTipo, 'i') });
  await expect(opcao).toBeVisible({ timeout: 10000 });
  await opcao.click();

  const titulo = getByRoleSge(conteudo, 'heading', {
    name: new RegExp(`Adicionar Tipo de Registro Pedagógico - ${textoTipo}`, 'i'),
  });
  await expect(titulo).toBeVisible({ timeout: 20000 });
  await expect(conteudo.locator('#Descricao:visible')).toBeVisible();
  await expect(conteudo.locator('#btn_salvar:visible')).toBeVisible();
}

export async function pesquisarTipoRegistroPedagogico(page: Page, descricao: string): Promise<void> {
  await navegarParaConsultaTipoRegistroPedagogico(page);
  const conteudo = main(page);
  const busca = conteudo.locator('#searchTerm:visible');
  await expect(busca).toBeVisible();
  await busca.fill(descricao);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR').replace(/\/$/, '') === ROTA_CONSULTA
        && response.request().method() === 'GET'
        && url.searchParams.get('searchTerm') === descricao;
    }, { timeout: 20000 }),
    conteudo.locator('#btnSubmitSearch:visible').click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A consulta de Tipo de Registro Pedagógico retornou HTTP ${resposta.status()}.`);
  }
  await aguardarConsulta(page);
  await expect(conteudo.locator('table:visible')).toBeVisible({ timeout: 15000 });
}

export function linhaTipoRegistroPedagogico(page: Page, descricao: string): Locator {
  const textoExato = descricao.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return main(page).locator('table:visible tbody td:visible')
    .filter({ hasText: new RegExp(`^\\s*${textoExato}\\s*$`) })
    .locator('xpath=..');
}
