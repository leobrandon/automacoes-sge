import { expect, type Page } from '@playwright/test';
import { isEscalaQAAuto } from '../factories/escala.factory';
import { pesquisarEscala } from '../helpers/navigation/escala.navigation';
import { excluirEscala } from './excluir-escala.action';

const LIMITE_EXCLUSOES = 100;

/**
 * Exclui, uma a uma pela interface, as Escalas cuja descrição começa com QAAUTO
 * e contém o termo informado. Exige o termo restrito a QAAUTO.
 */
export async function limparEscalasQAAuto(page: Page, termoBusca: string): Promise<string[]> {
  const termo = termoBusca.trim();
  if (!isEscalaQAAuto(termo)) {
    throw new Error('A limpeza de Escalas exige um termo de busca iniciado por "QAAUTO".');
  }

  const conteudo = page.locator('#main');
  const excluidas: string[] = [];

  for (let i = 0; i < LIMITE_EXCLUSOES; i++) {
    await pesquisarEscala(page, termo);
    const celula = conteudo.getByRole('cell', { name: /^QAAUTO/i }).first();
    if (await celula.count() === 0) break;

    const descricao = (await celula.innerText()).trim();
    if (!isEscalaQAAuto(descricao)) throw new Error(`Registro inesperado na limpeza: "${descricao}".`);

    await celula.click();
    await excluirEscala(page, { descricao });
    excluidas.push(descricao);
  }

  await pesquisarEscala(page, termo);
  await expect(conteudo.getByRole('cell', { name: /^QAAUTO/i })).toHaveCount(0);
  console.log(`[QAAUTO] ${excluidas.length} Escala(s) excluída(s) na limpeza de "${termo}".`);
  return excluidas;
}
