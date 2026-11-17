import { expect, type Locator, type Page } from '@playwright/test';
import { select2 } from '../select2.helper';
import { waitForSgeLoaders } from './common.navigation';

const ROTA_PESQUISA = '/planejamentoturma/partialplanejamentos';

/** Filtros obrigatórios da consulta de Escola > Planejamento. */
export interface FiltroPlanejamentoEscola {
  anoLetivo: string;
  tipoDeTurma: string;
  turma: string;
  tipoPlanejamento: string;
}

function main(page: Page): Locator {
  return page.locator('#main');
}

/** Escapa o texto para uso literal em RegExp (períodos podem ter "(", "+", "." etc.). */
export function escaparTextoRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Navega pelo menu visível Escola > Planejamento. Adicionar só existe na visão Unidade Escolar
 * (chame `entrarNaVisaoUnidadeEscolar` antes).
 */
export async function navegarParaPlanejamentoEscola(page: Page): Promise<void> {
  await expect(
    page.locator('header').getByText('Unidade Escolar', { exact: true }),
    'Chame entrarNaVisaoUnidadeEscolar antes: o planejamento é lançado na visão Unidade Escolar.',
  ).toBeVisible({ timeout: 15000 });

  // Marcador exclusivo da consulta: #btn_add é id genérico e outra listagem aberta enganaria o teste.
  const telaDePlanejamento = main(page).locator('#s2id_TipoDeRegistroPedagogicoId');
  // Já na tela, reabrir o menu não é necessário: o submenu recolhe durante o AJAX e o clique falha.
  if (!await telaDePlanejamento.isVisible().catch(() => false)) {
    const nav = page.locator('nav').first();
    const escola = nav.getByRole('link', { name: /^\W*Escola\W*$/ });
    const destino = nav.getByRole('link', { name: /^\W*Planejamento\W*$/ });

    await waitForSgeLoaders(page);
    for (let tentativa = 1; tentativa <= 4; tentativa++) {
      if (await destino.isVisible().catch(() => false)) {
        await destino.click({ timeout: 20000 });
        break;
      }
      await escola.click();
      await expect(destino, 'O submenu Escola não exibiu o item Planejamento.')
        .toBeVisible({ timeout: 5000 })
        .catch(() => undefined);
      await page.waitForTimeout(300);
    }

    await expect(telaDePlanejamento, 'A tela Escola > Planejamento não abriu.').toBeVisible({ timeout: 60000 });
  }

  await waitForSgeLoaders(page);
}

/** Preenche os filtros em cascata (ano, tipo de turma, turma, tipo) e pesquisa a grade. */
export async function pesquisarPlanejamentos(page: Page, filtro: FiltroPlanejamentoEscola): Promise<void> {
  await select2.select(page, '#s2id_AnoLetivoId', filtro.anoLetivo, { exactMatch: true });
  await select2.select(page, '#s2id_TipoDeTurma', filtro.tipoDeTurma, { exactMatch: true });
  await select2.select(page, '#s2id_TurmaId', filtro.turma, { exactMatch: true });
  await select2.select(page, '#s2id_TipoDeRegistroPedagogicoId', filtro.tipoPlanejamento, { exactMatch: true });

  const [resposta] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname.toLowerCase() === ROTA_PESQUISA && r.request().method() === 'GET', { timeout: 30000 }),
    main(page).locator('#btn_search').click(),
  ]);
  if (!resposta.ok()) throw new Error(`A pesquisa de planejamentos retornou HTTP ${resposta.status()}.`);
  await waitForSgeLoaders(page);
  await expect(main(page).locator('#tabela_planejamentos')).toBeVisible();
}

/** Linha da grade identificada pelo período (primeira coluna). */
export function linhaPlanejamento(page: Page, periodo: string): Locator {
  return main(page).locator('#tabela_planejamentos tbody tr').filter({
    has: page.locator('td').filter({ hasText: new RegExp(`^\\s*${escaparTextoRegex(periodo)}\\s*$`) }),
  });
}

/**
 * Entra na visão Unidade Escolar pelo seletor "Perfil" do topo (Perfil > Unidade Escolar) e confere a
 * escola logada. Usado quando "Autenticar Unidade" (Cadastro > Escolas) é recusado pelo tenant.
 */
export async function entrarNaVisaoUnidadeEscolar(page: Page, escola: string): Promise<void> {
  const contextoPerfil = page.locator('.project-context').filter({ has: page.locator('span.label', { hasText: 'Perfil:' }) });
  const seletorPerfil = contextoPerfil.locator('.project-selector');
  const unidadeLogada = page.getByTitle('Unidade logada');
  await expect(seletorPerfil).toBeVisible({ timeout: 30000 });

  if (!(await seletorPerfil.innerText()).includes('Unidade Escolar')) {
    await seletorPerfil.click();
    const opcao = contextoPerfil.locator('a.alteraPerfil').filter({ hasText: /^Unidade Escolar$/ });
    await expect(opcao, 'O perfil "Unidade Escolar" não está disponível para o usuário.').toBeVisible();
    await opcao.click();
    const confirmacao = page.locator('.swal2-popup:visible').filter({ hasText: 'deseja alterar para a visão Unidade Escolar?' });
    await expect(confirmacao).toBeVisible();
    await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();
    await expect(seletorPerfil).toContainText('Unidade Escolar', { timeout: 30000 });
  }
  await expect(unidadeLogada, `A sessão não está na escola esperada "${escola}".`).toHaveText(escola, { timeout: 30000 });
  await waitForSgeLoaders(page);
}
