import { Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

/**
 * Navega estritamente via interface (UI) até a tela de Consulta de Medida Caseira:
 * Menu Lateral > Alimentação Escolar > Cadastros Básicos > Medida Caseira (/medidacaseira).
 *
 * Segue a diretriz de 100% front-end visível e respeito ao roteamento oficial do SGE.
 *
 * @param page Instância do Playwright Page.
 */
export async function navegarParaConsultaMedidaCaseira(page: Page): Promise<void> {
  const isConsultaVisible = await page
    .locator('h4:has-text("Medida Caseira"), h3:has-text("Medida Caseira")')
    .first()
    .isVisible()
    .catch(() => false);

  const isFormVisible = await page
    .locator('#Descricao, input[name="Descricao"]')
    .first()
    .isVisible()
    .catch(() => false);

  if (isConsultaVisible && !isFormVisible) {
    return;
  }

  // 1. Localização no Sidebar
  const navSidebar = page.locator('nav, aside, .sidebar, #sidebar').first();
  const destino = navSidebar
    .locator('a[onclick*="/medidacaseira"], a[href*="/medidacaseira"]')
    .or(navSidebar.locator('a').filter({ hasText: /^\s*Medida Caseira\s*$/ }))
    .first();

  const isDestinoVisible = await destino.isVisible().catch(() => false);

  if (!isDestinoVisible) {
    // Verificar se o menu está recolhido e expandir se necessário
    const btnToggle = page
      .getByTitle('Mostar/Esconder Menu')
      .or(page.locator('.sidebar-toggle, .menu-toggle, [data-toggle="push-menu"]'))
      .first();

    const menuPai = navSidebar.locator('a').filter({ hasText: /^\s*Alimentação Escolar\s*$/ }).first();
    const isPaiVisible = await menuPai.isVisible().catch(() => false);

    if (!isPaiVisible && (await btnToggle.isVisible().catch(() => false))) {
      await btnToggle.click();
      await page.waitForTimeout(300);
    }

    // Expandir menu pai "Alimentação Escolar" se necessário
    if (await menuPai.isVisible().catch(() => false)) {
      const basicos = navSidebar.locator('a').filter({ hasText: /^\s*Cadastros Básicos\s*$/ }).first();
      const isBasicosVisible = await basicos.isVisible().catch(() => false);

      if (!isBasicosVisible) {
        await menuPai.click();
        await page.waitForTimeout(300);
      }

      // Expandir submenu "Cadastros Básicos" se necessário
      if (await basicos.isVisible().catch(() => false)) {
        const isDestinoAberto = await destino.isVisible().catch(() => false);
        if (!isDestinoAberto) {
          await basicos.click();
          await page.waitForTimeout(300);
        }
      }
    }
  }

  // 2. Clicar no link de Medida Caseira
  await destino.waitFor({ state: 'visible', timeout: 15000 });
  await destino.click();

  // 3. Aguardar renderização da tela de consulta
  await page
    .locator('h4:has-text("Medida Caseira"), h3:has-text("Medida Caseira"), #searchTerm, input[type="search"]')
    .first()
    .waitFor({ state: 'visible', timeout: 20000 });

  await waitForSgeLoaders(page);
}

/**
 * Navega estritamente via interface (UI) até a tela/modal de Inclusão de Medida Caseira:
 * Menu > Alimentação Escolar > Cadastros Básicos > Medida Caseira > Botão "Adicionar" (ou "+").
 *
 * @param page Instância do Playwright Page.
 */
export async function navegarParaAdicionarMedidaCaseira(page: Page): Promise<void> {
  const isFormVisible = await page
    .locator('#Descricao, input[name="Descricao"]')
    .first()
    .isVisible()
    .catch(() => false);

  if (isFormVisible) {
    return;
  }

  // 1. Navegar até a tela de consulta
  await navegarParaConsultaMedidaCaseira(page);

  // 2. Localizar e acionar botão de inclusão (pode conter texto ou apenas o ícone '+')
  const btnAdicionar = page
    .locator(
      'button:has-text("Adicionar"), a:has-text("Adicionar"), button:has-text("Novo"), button:has-text("Nova"), button:has(i.fa-plus), a:has(i.fa-plus), button[title*="Adicionar"], button[title*="Incluir"], button[title*="Nova Medida"]'
    )
    .first();

  await btnAdicionar.waitFor({ state: 'visible', timeout: 15000 });
  await waitForSgeLoaders(page);
  await btnAdicionar.click();

  // 3. Aguardar exibição do campo obrigatório Descrição
  await page
    .locator('#Descricao, input[name="Descricao"]')
    .first()
    .waitFor({ state: 'visible', timeout: 15000 });

  await waitForSgeLoaders(page);
}
