import {expect, type Page} from '@playwright/test';
import {buildAnoLetivo} from '../factories/ano-letivo.factory';
import {linhaAnoLetivo, pesquisarAnoLetivo, tituloConsultaAnoLetivo} from '../helpers/navigation/ano-letivo.navigation';

/** Exclui apenas o ano informado. Recusa o ano corrente e anteriores (dados reais da rede). */
export async function excluirAnoLetivo(page: Page, ano: string): Promise<void> {
  const alvo = buildAnoLetivo({ano, metaAproveitamento: '0,00', metaMedia: '0,0'}).ano;
  await pesquisarAnoLetivo(page, alvo);
  const linha = linhaAnoLetivo(page, alvo);
  await expect(linha).toHaveCount(1);
  await linha.click();
  const m = page.locator('#main');
  await expect(m.locator('h4').filter({hasText: 'Editar Ano Letivo'})).toBeVisible();
  await expect(m.locator('#Ano')).toHaveValue(alvo);
  await m.locator('#btn_excluir').click();
  const confirmacao = page.locator('.MessageBoxContainer:visible').filter({hasText: 'Tem certeza que deseja excluir?'});
  await expect(confirmacao).toBeVisible();
  await confirmacao.getByRole('button', {name: 'Sim', exact: true}).click();
  await expect(tituloConsultaAnoLetivo(page)).toBeVisible();
  await pesquisarAnoLetivo(page, alvo);
  await expect(linhaAnoLetivo(page, alvo)).toHaveCount(0);
}
