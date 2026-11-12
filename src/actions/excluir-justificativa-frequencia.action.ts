import { expect, type Page } from '@playwright/test';
import { isJustificativaFrequenciaQAAuto } from '../factories/justificativa-frequencia.factory';
import {
  aguardarCarregamentoJustificativaFrequencia,
  linhaJustificativaFrequencia,
  pesquisarJustificativaFrequencia,
} from '../helpers/navigation/justificativa-frequencia.navigation';

export interface JustificativaFrequenciaExcluida {
  descricao: string;
  url: string;
}

/** Exclui pela grade somente uma justificativa QAAUTO identificada por descrição exata. */
export async function excluirJustificativaFrequencia(
  page: Page,
  descricao: string,
): Promise<JustificativaFrequenciaExcluida> {
  const alvo = descricao.trim();
  if (!isJustificativaFrequenciaQAAuto(alvo)) {
    throw new Error('A exclusão automatizada exige a descrição exata QAAUTO com sufixo numérico.');
  }

  await pesquisarJustificativaFrequencia(page, alvo);
  const linha = linhaJustificativaFrequencia(page, alvo);
  const quantidadeEncontrada = await linha.count();
  if (quantidadeEncontrada === 0) return { descricao: alvo, url: page.url() };
  if (quantidadeEncontrada !== 1) {
    throw new Error(`A busca exata por "${alvo}" retornou ${quantidadeEncontrada} linhas; nenhuma foi removida.`);
  }
  const celula = linha.locator('td').first();
  await expect(celula).toBeVisible();
  const descricaoEncontrada = (await celula.innerText()).trim();
  if (descricaoEncontrada !== alvo) {
    throw new Error(`A linha selecionada contém "${descricaoEncontrada}", não a descrição exata "${alvo}".`);
  }
  const remover = linha.locator('a[title="Remover"]');
  await expect(remover).toBeVisible();
  await remover.click();

  const confirmacao = page.getByText(/Tem certeza que deseja remover essa justificativa de frequência\?/i);
  await expect(confirmacao).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Sim', exact: true }).click();

  const sucesso = page.getByText('A justificativa de frequência foi removida.', { exact: true });
  await expect(sucesso).toBeVisible({ timeout: 20000 });
  const alerta = page.locator(
    '.swal2-popup:visible, .sweet-alert:visible, .divMessageBox:visible, .MessageBoxContainer:visible, [role="dialog"]:visible',
  ).filter({ has: sucesso }).last();
  const ok = alerta.getByRole('button', { name: /^(Ok|OK|Fechar)$/i }).first();
  if (await ok.isVisible().catch(() => false)) await ok.click();

  await aguardarCarregamentoJustificativaFrequencia(page);
  await page.locator('#main #searchTerm:visible').waitFor({ state: 'visible', timeout: 20000 });
  await pesquisarJustificativaFrequencia(page, alvo);
  await expect(linhaJustificativaFrequencia(page, alvo)).toHaveCount(0, { timeout: 15000 });
  console.log(`[QAAUTO] Remoção confirmada: ${alvo}`);
  return { descricao: alvo, url: page.url() };
}
