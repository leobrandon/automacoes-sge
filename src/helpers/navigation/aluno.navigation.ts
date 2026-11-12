import { Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

/**
 * Navega estritamente via interface (UI) até a tela de Consulta de Alunos:
 * Menu Lateral > Aluno/Estudante > Cadastro (/alunoindex).
 */
export async function navegarParaConsultaAlunos(page: Page): Promise<void> {
  // Se já estiver na tela de consulta de alunos (com #grid ou #searchTerm visível)
  const isConsultaVisible = await page.locator('#searchTerm, #grid').first().isVisible().catch(() => false);
  const isFormAlunoVisible = await page.locator('#form-aluno, h4:has-text("Editar Estudante"), h4:has-text("Matrícula Estudante")').first().isVisible().catch(() => false);

  if (isConsultaVisible && !isFormAlunoVisible) {
    return;
  }

  // 1. Se estiver no formulário de cadastro ou edição, o botão "Voltar" retorna diretamente para a consulta
  const btnVoltar = page.locator('button:has-text("Voltar"), a:has-text("Voltar")').first();
  if (await btnVoltar.isVisible().catch(() => false)) {
    await btnVoltar.click();
    await waitForSgeLoaders(page);
    const isConsultaNow = await page.locator('#searchTerm, #grid, h4:has-text("Consulta de Alunos"), :text("Consulta de Estudantes")').first().isVisible({ timeout: 5000 }).catch(() => false);
    if (isConsultaNow) {
      return;
    }
  }

  // 2. Navegação resiliente via Menu Lateral
  const navSidebar = page.locator('nav, aside, .sidebar, #sidebar').first();
  const submenuCadastro = navSidebar.locator('a[onclick*="/alunoindex"]').first();

  const isSubmenuVisible = await submenuCadastro.isVisible().catch(() => false);
  if (!isSubmenuVisible) {
    // Localiza e expande o menu pai "Estudante / Criança" ou "Aluno"
    const menuPai = navSidebar
      .locator('li')
      .filter({ has: page.locator('a[onclick*="/alunoindex"]') })
      .locator('> a')
      .first();

    await menuPai.waitFor({ state: 'visible', timeout: 10000 });
    await menuPai.click();
    await submenuCadastro.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(300); // Aguardar estabilização da animação do submenu
  }

  // Clicar no submenu Cadastro (/alunoindex)
  await submenuCadastro.click();

  // 3. Aguardar tela de listagem de alunos
  await page.locator('#searchTerm, #grid, h4:has-text("Consulta de Alunos"), :text("Consulta de Estudantes")').first().waitFor({ state: 'visible', timeout: 20000 });
  await waitForSgeLoaders(page);
}

/**
 * Navega estritamente via interface (UI) até a tela de Adicionar Aluno:
 * Menu Lateral > Aluno/Estudante > Cadastro > Botão "Adicionar".
 */
export async function navegarParaAdicionarAluno(page: Page): Promise<void> {
  // 1. Se já estiver em um formulário novo e limpo (campo matrícula editável e sem ID persistido)
  const formAluno = page.locator('#form-aluno');
  const inputMatricula = page.locator('#MatriculaEscola');
  const isFormVisible = await formAluno.isVisible().catch(() => false);

  if (isFormVisible) {
    const isReadonly = await inputMatricula.getAttribute('readonly').catch(() => null);
    const inputId = page.locator('input#Id, input[name="Id"], #AlunoId').first();
    const idValue = (await inputId.inputValue().catch(() => '')) || '';

    // Após salvar, o SGE mantém o aluno na tela "Editar Aluno", cujo formulário parece novo mas não é.
    const emEdicao = await page.locator('#main h4:has-text("Editar Aluno")').isVisible().catch(() => false);

    // Se o formulário está visível, NÃO é readonly e o ID é vazio/0, então já estamos em um formulário novo limpo
    if (!emEdicao && !isReadonly && (!idValue || idValue === '0')) {
      return;
    }
  }

  // 2. Navegar até a consulta de alunos (saindo antes da tela "Editar Aluno", se for o caso)
  const tituloEdicao = page.locator('#main h4:has-text("Editar Aluno")');
  if (await tituloEdicao.isVisible().catch(() => false)) {
    await page.locator('#main').getByRole('button', { name: /Voltar/ }).first().click();
    await tituloEdicao.waitFor({ state: 'hidden', timeout: 60000 });
    await waitForSgeLoaders(page);
  }
  await navegarParaConsultaAlunos(page);

  // 3. Aguardar botão Adicionar
  const btnAdicionar = page.locator('button:has-text("Adicionar"), a:has-text("Adicionar")').first();
  await btnAdicionar.waitFor({ state: 'visible', timeout: 15000 });
  await waitForSgeLoaders(page);

  // 4. Clicar no botão Adicionar
  await btnAdicionar.click();

  // 5. Aguardar renderização do formulário #form-aluno
  await formAluno.waitFor({ state: 'visible', timeout: 15000 });
  await waitForSgeLoaders(page);
  // O formulário aparece antes de os Select2 serem inicializados; aguarda a Escola ficar utilizável.
  await page.locator('#s2id_EscolaId:not(.select2-container-disabled) .select2-choice').waitFor({ state: 'visible', timeout: 30000 });
}
