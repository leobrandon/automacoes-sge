import { expect, type Locator, type Page } from '@playwright/test';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import type { TipoFornecedor } from '../helpers/navigation/fornecedor.navigation';

/**
 * Preenche CPF/CNPJ e sai do campo; o SGE só libera o salvamento depois da verificação
 * de duplicidade (GET /Fornecedor/VerificaFornecedor) disparada na saída do campo.
 */
export async function preencherDocumentoFornecedor(campo: Locator, valor: string): Promise<void> {
  const page = campo.page();
  await campo.fill(valor);
  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR') === '/fornecedor/verificafornecedor';
    }, { timeout: 15000 }),
    campo.press('Tab'),
  ]);
  if (!resposta.ok()) {
    throw new Error(`A verificação do documento do Fornecedor retornou HTTP ${resposta.status()}.`);
  }
}

/** Clica em Excluir na edição, confirma o aviso e fecha o "Fornecedor excluído!". */
export async function confirmarExclusaoFornecedor(page: Page): Promise<void> {
  const excluir = getByRoleSge(page.locator('#main'), 'button', { name: /Excluir/i });
  await expect(excluir).toBeVisible();
  await excluir.click();

  await expect(page.getByText('Tem certeza que deseja excluir?', { exact: true }))
    .toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Sim', exact: true }).click();

  await expect(page.getByText('Fornecedor excluído!', { exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Ok', exact: true }).click();
}

/** Salva o formulário de Fornecedor, confirma o aviso de sucesso e aguarda a tela de edição. */
export async function salvarFornecedorAdicionado(page: Page, tipo: TipoFornecedor): Promise<void> {
  const formulario = page.locator('#main');

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR') === '/fornecedor/postfornecedor'
        && response.request().method() === 'POST';
    }, { timeout: 20000 }),
    getByRoleSge(formulario, 'button', { name: /Salvar/i }).click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`O salvamento do Fornecedor retornou HTTP ${resposta.status()}.`);
  }

  await expect(page.getByText('Fornecedor adicionado!', { exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(getByRoleSge(formulario, 'heading', { name: new RegExp(`Editar Fornecedor ${tipo}`, 'i') }))
    .toBeVisible({ timeout: 20000 });
}
