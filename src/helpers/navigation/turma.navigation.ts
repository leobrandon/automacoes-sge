import { Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

/**
 * Navega estritamente via interface (UI) até a tela de Consulta de Turmas:
 * Menu Lateral > Unidade Educacional / Escola > Turma (/turma).
 */
export async function navegarParaConsultaTurmas(page: Page): Promise<void> {
  const isConsultaVisible = await page
    .locator('h4:has-text("Consulta de Turmas"), :text("Consulta de Turmas"), button[title="Adicionar turma"]')
    .first()
    .isVisible()
    .catch(() => false);

  const isFormTurmaVisible = await page
    .locator('h4:has-text("Adicionar Turma"), h4:has-text("Editar Turma"), #Descricao')
    .first()
    .isVisible()
    .catch(() => false);

  if (isConsultaVisible && !isFormTurmaVisible) {
    return;
  }

  // 1. Localizar o item de menu "Turma" (/turma)
  const navSidebar = page.locator('nav, aside, .sidebar, #sidebar').first();
  const submenuTurma = navSidebar.locator('a[onclick*="\'/turma\'"]').first();

  const isSubmenuVisible = await submenuTurma.isVisible().catch(() => false);
  if (!isSubmenuVisible) {
    // Localiza e expande o menu pai "Unidade Educacional" ou "Escola"
    const menuPai = navSidebar
      .locator('li')
      .filter({ has: page.locator('a[onclick*="\'/turma\'"]') })
      .locator('> a')
      .first();

    await menuPai.waitFor({ state: 'visible', timeout: 10000 });
    await menuPai.click();
    await submenuTurma.waitFor({ state: 'visible', timeout: 10000 });
  }

  // 2. Clicar no submenu Turma (/turma)
  await submenuTurma.click();

  // 3. Aguardar renderização da tela de consulta de turmas
  await page
    .locator('h4:has-text("Consulta de Turmas"), button[title="Adicionar turma"]')
    .first()
    .waitFor({ state: 'visible', timeout: 20000 });
  await waitForSgeLoaders(page);
}

/**
 * Navega estritamente via interface (UI) até a tela de Adicionar Turma:
 * Menu Lateral > Unidade Educacional > Turma > Botão "Adicionar" (Dropdown) > Opção escolhida.
 * 
 * @param page Instância do Playwright Page.
 * @param tipo Opção de turma desejada: 'Escolarizacao' | 'AEE' | 'Diversificada' | 'Alternativa'. Padrão: 'Escolarizacao'.
 */
export async function navegarParaAdicionarTurma(
  page: Page,
  tipo: 'Escolarizacao' | 'AEE' | 'Diversificada' | 'Alternativa' = 'Escolarizacao'
): Promise<void> {
  const seletorTituloMap: Record<string, string> = {
    Escolarizacao: 'Adicionar Turma Escolarização',
    AEE: 'Adicionar Turma AEE',
    Diversificada: 'Adicionar Turma Diversificada',
    Alternativa: 'Adicionar Turma Alternativa'
  };

  const tituloEsperado = seletorTituloMap[tipo] || 'Adicionar Turma';
  const isFormVisivel = await page.locator(`h4:has-text("${tituloEsperado}")`).first().isVisible().catch(() => false);
  if (isFormVisivel) {
    return;
  }

  // 1. Navegar até a consulta de turmas
  await navegarParaConsultaTurmas(page);

  // 2. Clicar no botão "Adicionar" (dropdown-toggle)
  const btnAdicionar = page
    .locator('button.dropdown-toggle[title="Adicionar turma"], button:has-text("Adicionar")')
    .first();
  await btnAdicionar.waitFor({ state: 'visible', timeout: 15000 });
  await waitForSgeLoaders(page);
  await btnAdicionar.click();

  // 3. Selecionar a opção no dropdown visível
  const opcoesMap: Record<string, { texto: string; seletor: string }> = {
    Escolarizacao: { texto: 'Escolarização', seletor: 'a[onclick*="tipoDeTurma=0"]' },
    AEE: { texto: 'AEE', seletor: 'a[onclick*="/turmaaee/create"]' },
    Diversificada: { texto: 'Diversificada', seletor: 'a[onclick*="/turmadiversificada"]' },
    Alternativa: { texto: 'Alternativa', seletor: 'a[onclick*="tipoDeTurma=3"]' }
  };

  const configOpcao = opcoesMap[tipo] || opcoesMap.Escolarizacao;
  const linkOpcao = page
    .locator('.dropdown-menu:visible a, .btn-group.open a, .dropdown.open a')
    .filter({ hasText: configOpcao.texto })
    .or(page.locator(`.dropdown-menu:visible ${configOpcao.seletor}`))
    .or(page.locator(`a:visible:has-text("${configOpcao.texto}")`))
    .first();

  await linkOpcao.waitFor({ state: 'visible', timeout: 10000 });
  await linkOpcao.click();

  // 4. Aguardar carregamento dos campos do formulário
  await page
    .locator(`h4:has-text("${tituloEsperado}"), #Descricao, #tabDadosGerais`)
    .first()
    .waitFor({ state: 'visible', timeout: 20000 });
  await waitForSgeLoaders(page);
}
