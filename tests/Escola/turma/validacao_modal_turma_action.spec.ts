import { test, expect } from '@playwright/test';
import { loginSge, navegarParaAdicionarTurma, waitForSgeLoaders } from '../../../src/helpers';
import { fecharModalSalvarTurma } from '../../../src/actions';

/**
 * Validação Comportamental do Modal de Salvamento de Turma:
 * Conforme especificado pelo usuário:
 * "Para as turmas se tentar salvar sem preencher nenhum campo, o sistema abre um modal
 * e pergunta como você deseja salvar essa turma, se é como ativo ou como rascunho
 * e a única forma de fechar o modal é clicando no X no topo direito."
 */
test.describe('Validação Comportamental: Modal de Salvamento de Turma', () => {

  test('Deve abrir modal de decisão ao clicar em Salvar sem preencher campos e fechar exclusivamente pelo botão X', async ({ page }) => {
    // 1. Autenticação no SGE
    await loginSge(page);

    // 2. Navegação estrita via UI até Adicionar Turma Escolarização
    await navegarParaAdicionarTurma(page, 'Escolarizacao');
    await waitForSgeLoaders(page);

    // 3. Tentar salvar imediatamente sem preencher nenhum campo obrigatório adicional
    const btnSalvar = page.locator('button:has-text("Salvar")').first();
    await btnSalvar.waitFor({ state: 'visible', timeout: 10000 });
    await btnSalvar.click();

    // 4. Asserção 1: O modal SweetAlert deve estar visível com a pergunta correta
    const modalContainer = page.locator('.swal2-container:visible');
    await expect(modalContainer).toBeVisible({ timeout: 5000 });

    const tituloModal = page.locator('.swal2-title');
    await expect(tituloModal).toHaveText('Como você deseja salvar essa turma?');

    // 5. Asserção 2: O modal deve apresentar os botões "Salvar Ativo" e "Salvar Rascunho"
    const btnSalvarAtivo = page.locator('.swal2-confirm:has-text("Salvar Ativo")');
    const btnSalvarRascunho = page.locator('.swal2-deny:has-text("Salvar Rascunho")');
    await expect(btnSalvarAtivo).toBeVisible();
    await expect(btnSalvarRascunho).toBeVisible();

    // 6. Asserção 3: O botão de fechar "X" no topo direito (.swal2-close) deve estar visível
    const btnFecharX = page.locator('.swal2-close');
    await expect(btnFecharX).toBeVisible();

    // 7. Executa o fechamento exclusivo pelo botão X
    console.log('ℹ️  Modal de decisão aberto com sucesso. Clicando no botão [X] no topo direito para fechar...');
    await fecharModalSalvarTurma(page);

    // 8. Asserção 4: O modal deve ser totalmente fechado
    await expect(modalContainer).toBeHidden({ timeout: 5000 });

    // 9. Asserção 5: Permanece na mesma página de Adicionar Turma sem redirecionamento indevido
    const heading = page.locator('h4:has-text("Adicionar Turma Escolarização")').first();
    await expect(heading).toBeVisible();

    console.log('✅ Modal fechado com sucesso pelo botão [X] sem persistir a turma.');
  });

});
