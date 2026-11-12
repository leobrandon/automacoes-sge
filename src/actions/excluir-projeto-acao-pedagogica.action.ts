import { expect, type Page } from '@playwright/test';
import {
  validarProjetoPedagogico,
  type ProjetoPedagogicoDados,
} from '../factories/projeto-acao-pedagogica.factory';
import {
  linhaProjeto,
  pesquisarProjeto,
} from '../helpers/navigation/projeto-acao-pedagogica.navigation';
export async function excluirProjetoPedagogico(
  page: Page,
  dados: ProjetoPedagogicoDados,
  id: string,
): Promise<void> {
  const d = validarProjetoPedagogico(dados);
  if (!/^\d+$/.test(id) || id === '0')
    throw new Error('Informe o ID exato do projeto criado pela execução.');
  await pesquisarProjeto(page, d);
  const linha = linhaProjeto(page, d);
  await expect(linha).toHaveCount(1);
  await expect(linha.locator('input[name="url"]')).toHaveValue(
    new RegExp(`[?&]projetoEAcaoId=${id}(?:&|$)`),
  );
  await linha.click();
  const m = page.locator('#main');
  await expect(m.locator('#Id')).toHaveValue(id);
  await expect(m.locator('#btnExcuirProjeto')).toBeVisible();
  await m.locator('#btnExcuirProjeto').click();
  const dlog = page.getByRole('dialog').filter({ hasText: 'Tem certeza que deseja excluir?' });
  await expect(dlog).toBeVisible();
  await dlog.getByRole('button', { name: 'Sim', exact: true }).click();
  const sucesso = page.getByRole('dialog').filter({ hasText: 'Projeto excluído!' });
  await expect(sucesso).toBeVisible();
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await pesquisarProjeto(page, d);
  await expect(linhaProjeto(page, d)).toHaveCount(0);
}
