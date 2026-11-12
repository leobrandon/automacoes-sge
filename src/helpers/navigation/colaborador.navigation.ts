import { Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

/**
 * Navega estritamente via interface (UI) até a tela de Consulta de Colaboradores / Servidores:
 * Menu Lateral > Colaborador > Cadastro (/colaborador).
 */
export async function navegarParaConsultaColaborador(page: Page): Promise<void> {
  const isConsultaVisible = await page.locator('h4:has-text("Consulta de Colaboradores"), :text("Consulta de Servidores"), #searchTerm').first().isVisible().catch(() => false);
  const isFormColaboradorVisible = await page.locator('h4:has-text("Adicionar Colaborador"), h4:has-text("Editar Servidor"), #PessoaNome').first().isVisible().catch(() => false);

  if (isConsultaVisible && !isFormColaboradorVisible) {
    return;
  }

  // 1. Localizar o item de menu "Servidor" que contém o submenu de cadastro (/colaborador)
  const navSidebar = page.locator('nav, aside, .sidebar, #sidebar').first();
  const itemMenuServidor = navSidebar.locator('li').filter({ has: page.locator('a[onclick*="/colaborador"]') }).first();
  const linkMenuServidor = itemMenuServidor.locator('> a').first();
  const submenuCadastro = itemMenuServidor.locator('a[onclick*="/colaborador"]').first();

  const isSubmenuVisible = await submenuCadastro.isVisible().catch(() => false);
  if (!isSubmenuVisible) {
    await linkMenuServidor.click();
    await submenuCadastro.waitFor({ state: 'visible', timeout: 10000 });
  }

  // 2. Clicar no submenu Cadastro de Servidor/Colaborador
  await submenuCadastro.click();

  // 3. Aguardar renderização da tela de consulta
  await page.locator('h4:has-text("Consulta de Colaboradores"), :text("Consulta de Servidores"), #searchTerm, #grid').first().waitFor({ state: 'visible', timeout: 20000 });
  await waitForSgeLoaders(page);
}

/**
 * Navega estritamente via interface (UI) até a tela de Adicionar Colaborador:
 * Menu Lateral > Colaborador > Cadastro > Botão "Adicionar".
 */
export async function navegarParaAdicionarColaborador(page: Page): Promise<void> {
  const isFormColaboradorVisible = await page.locator('h4:has-text("Adicionar Colaborador"), #PessoaNome').first().isVisible().catch(() => false);
  if (isFormColaboradorVisible) {
    return;
  }

  // 1. Navegar até a consulta de colaboradores
  await navegarParaConsultaColaborador(page);

  // 2. Clicar no botão Adicionar
  const btnAdicionar = page.locator('button:has-text("Adicionar"), a:has-text("Adicionar")').first();
  await btnAdicionar.waitFor({ state: 'visible', timeout: 15000 });
  await waitForSgeLoaders(page);
  await btnAdicionar.click();

  // 3. Aguardar carregamento dos campos do formulário
  await page.locator('#PessoaNome, h4:has-text("Adicionar Colaborador")').first().waitFor({ state: 'visible', timeout: 15000 });
  await waitForSgeLoaders(page);
}
