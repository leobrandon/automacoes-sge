import { expect, type Page } from '@playwright/test';
import {
  isCalendarioQAAuto,
  type ConfiguracaoAnoEscolarAlvo,
} from '../factories/configurar-ano-escolar.factory';
import {
  linhaConfiguracaoAnoEscolar,
  pesquisarConfiguracaoAnoEscolar,
} from '../helpers/navigation/configurar-ano-escolar.navigation';

export async function excluirConfiguracaoAnoEscolar(
  page: Page,
  alvo: ConfiguracaoAnoEscolarAlvo,
): Promise<ConfiguracaoAnoEscolarAlvo> {
  if (!isCalendarioQAAuto(alvo.calendarioEscolar))
    throw new Error('A exclusão exige um calendário escolar QAAUTO.');
  await pesquisarConfiguracaoAnoEscolar(page, alvo.calendarioEscolar);
  const linha = linhaConfiguracaoAnoEscolar(page, alvo);
  await expect(linha).toHaveCount(1);
  await linha.click();
  const main = page.locator('#main');
  // Confere que o registro aberto é o alvo (o QAAUTO é exigido no calendário).
  await expect(main.locator('#SerieId option:checked')).toHaveText(alvo.anoEscolar);
  await expect(main.locator('#ComposicaoCalendarioId option:checked')).toHaveText(alvo.composicaoEnsino);
  await expect(main.locator('#ComposicaoCalendarioCalendarioEscolarId option:checked')).toHaveText(
    alvo.calendarioEscolar,
  );
  await main.locator('#btn_excluir').click();
  await expect(page.getByText('Tem certeza que deseja excluir?')).toBeVisible();
  // O diálogo não tem role=dialog; o botão da confirmação é o único button "Sim" (os toggles são label).
  await page.locator('button.botTempo').filter({ hasText: /^\s*Sim\s*$/ }).click();
  await expect(
    page.getByText('Ano Escolar da Composição de Ensino foi excluído com sucesso!'),
  ).toBeVisible();
  await pesquisarConfiguracaoAnoEscolar(page, alvo.calendarioEscolar);
  await expect(linhaConfiguracaoAnoEscolar(page, alvo)).toHaveCount(0);
  return alvo;
}
