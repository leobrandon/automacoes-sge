import { expect, type Page } from '@playwright/test';
import { waitForSgeLoaders } from './common.navigation';

/** Abre Escola > Conteúdo Aplicado pela navegação visível do SGE. */
export async function navegarParaConteudoAplicado(page: Page): Promise<void> {
  const nav = page.locator('nav');
  const escola = nav.getByRole('link', { name: /^\W*Escola\W*$/ });
  const destino = nav.getByRole('link', { name: /^\W*Conteúdo Aplicado\W*$/ });

  await waitForSgeLoaders(page);
  if (!await destino.isVisible()) {
    await escola.waitFor({ state: 'visible', timeout: 15000 });
    await escola.click();
  }
  await destino.waitFor({ state: 'visible', timeout: 15000 });
  await destino.click();

  await expect(page.locator('#formConteudoAplicado')).toBeVisible({ timeout: 30000 });
  await waitForSgeLoaders(page);
}
