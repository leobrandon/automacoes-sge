import { expect, type Page } from '@playwright/test';
import {
  buildJustificativaFrequencia,
  type BuildJustificativaFrequenciaOptions,
  type JustificativaFrequenciaData,
} from '../factories/justificativa-frequencia.factory';
import { navegarParaAdicionarJustificativaFrequencia } from '../helpers/navigation/justificativa-frequencia.navigation';

export interface JustificativaFrequenciaCriada extends JustificativaFrequenciaData {
  url: string;
  sequencia: number;
}

async function definirOpcao(page: Page, id: 'Abono' | 'Ativa', valor: 'Sim' | 'Não'): Promise<void> {
  const controle = page.locator(`#main #${id}`);
  const esperado = valor === 'Sim';
  if (await controle.isChecked() !== esperado) {
    await page.locator(`#main label:has(#${id}) .toggle`).click();
  }
  await expect(controle).toBeChecked({ checked: esperado });
}

/** Cria uma justificativa pela tela e exige confirmação visível de sucesso. */
export async function criarJustificativaFrequencia(
  page: Page,
  options: BuildJustificativaFrequenciaOptions = {},
  sequencia = 1,
): Promise<JustificativaFrequenciaCriada> {
  const dados = buildJustificativaFrequencia(options, sequencia);
  await navegarParaAdicionarJustificativaFrequencia(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao').fill(dados.descricao);
  await definirOpcao(page, 'Abono', dados.abonaFalta ? 'Sim' : 'Não');
  await definirOpcao(page, 'Ativa', dados.ativa ? 'Sim' : 'Não');

  await formulario.locator('#btn-salvar').click();

  const feedback = page.locator('.swal2-popup:visible');
  await expect(feedback).toBeVisible({ timeout: 20000 });
  await expect(feedback).toContainText('Os dados foram salvos.', { timeout: 20000 });
  const mensagem = (await feedback.innerText()).trim();
  await feedback.locator('.swal2-confirm').click();
  await expect(feedback).toBeHidden({ timeout: 15000 });
  if (!/(salv[ao]|cadastrad[ao]|sucesso)/i.test(mensagem) || /(erro|falha|inválid)/i.test(mensagem)) {
    throw new Error(`O SGE não confirmou a criação de "${dados.descricao}": ${mensagem}`);
  }

  await formulario.locator('#searchTerm:visible').waitFor({ state: 'visible', timeout: 20000 });
  console.log(`[QAAUTO] Salvamento confirmado: ${dados.descricao} | Abono: ${dados.abonaFalta ? 'Sim' : 'Não'}`);
  return { ...dados, sequencia, url: page.url() };
}
