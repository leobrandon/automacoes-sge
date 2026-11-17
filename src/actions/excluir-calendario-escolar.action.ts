import { expect, type Page } from '@playwright/test';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  abrirAbaComposicaoEnsino,
  abrirCalendarioEscolar,
  linhaCalendarioEscolar,
  linhasComposicaoCalendario,
  pesquisarCalendarioEscolar,
} from '../helpers/navigation/calendario-escolar.navigation';

/**
 * O SGE recusa excluir um calendário com composições vinculadas
 * ("Não é possível deletar esse calendário, pois existem composições vinculadas a ele."),
 * então as composições são removidas antes, pela própria grade do calendário.
 */
async function removerComposicoesCalendarioEscolar(page: Page): Promise<number> {
  const m = page.locator('#main');
  let removidas = 0;
  let totalAnterior = Number.MAX_SAFE_INTEGER;
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    await abrirAbaComposicaoEnsino(page);
    const linhas = linhasComposicaoCalendario(page);
    const total = await linhas.count();
    if (total === 0) return removidas;
    if (total >= totalAnterior)
      throw new Error(
        `A grade de composições não diminuiu: ${total} linha(s) antes de remover a próxima.`,
      );
    totalAnterior = total;
    await linhas.first().click();
    await expect(
      m.locator('h4').filter({ hasText: 'Editar Configuração de Composição De Ensino' }),
    ).toBeVisible({ timeout: 30000 });
    await getByRoleSge(m, 'button', { name: /Excluir/ }).click();
    const confirmacao = page
      .locator('.MessageBoxContainer:visible')
      .filter({ hasText: 'Tem certeza que deseja excluir?' });
    await expect(confirmacao).toBeVisible();
    await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();
    await expect(m.locator('h4').filter({ hasText: 'Editar Calendário Escolar' })).toBeVisible({
      timeout: 30000,
    });
    removidas++;
  }
  throw new Error('A remoção das composições do calendário não terminou em 20 tentativas.');
}

export async function excluirCalendarioEscolar(page: Page, nome: string): Promise<string> {
  const alvo = nome.trim();
  if (!/^QAAUTO\b/i.test(alvo)) throw new Error('A exclusão exige descrição QAAUTO.');
  await abrirCalendarioEscolar(page, alvo);
  await removerComposicoesCalendarioEscolar(page);
  const m = page.locator('#main');
  await expect(m.locator('#Descricao')).toHaveValue(alvo);
  await m.locator('#btn_excluir').click();
  const confirmacao = page
    .locator('.MessageBoxContainer:visible')
    .filter({ hasText: 'Tem certeza que deseja excluir?' });
  await expect(confirmacao).toBeVisible();
  await confirmacao.getByRole('button', { name: 'Sim', exact: true }).click();
  await expect(m.locator('h4').filter({ hasText: 'Editar Ano Letivo' })).toBeVisible();
  await pesquisarCalendarioEscolar(page, alvo);
  await expect(linhaCalendarioEscolar(page, alvo)).toHaveCount(0);
  return alvo;
}

/** A exclusão geral é iniciada apenas pela configuração explícita da spec. */
export async function excluirCalendariosEscolaresQAAUTO(page: Page): Promise<string[]> {
  const excluidos: string[] = [];
  while (true) {
    await pesquisarCalendarioEscolar(page, 'QAAUTO');
    let encontrado: string | undefined;

    while (true) {
      const linhas = page.locator('#main table tbody tr:visible');
      const celulas = await linhas.evaluateAll((rows) =>
        rows.map((row) =>
          Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() || ''),
        ),
      );
      encontrado = celulas.flat().find((valor) => /^QAAUTO\b/i.test(valor));
      if (encontrado) break;

      const proxima = page.locator('#main').getByRole('link', {
        name: 'Próxima',
        exact: true,
        includeHidden: true,
      });
      if ((await proxima.count()) === 0 || !(await proxima.isVisible())) break;
      const desabilitada = await proxima.evaluate((el) => {
        const item = el.closest('li');
        return (
          el.getAttribute('aria-disabled') === 'true' ||
          el.classList.contains('disabled') ||
          item?.classList.contains('disabled') === true ||
          item?.getAttribute('aria-disabled') === 'true'
        );
      });
      if (desabilitada) break;
      const marcadorAnterior = await linhas.allTextContents();
      const [resposta] = await Promise.all([
        page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname.toLowerCase() === '/calendarioescolar/indexgrid' &&
            r.request().method() === 'GET',
          { timeout: 20000 },
        ),
        proxima.click(),
      ]);
      if (!resposta.ok())
        throw new Error(`Paginação de calendários retornou HTTP ${resposta.status()}.`);
      await expect
        .poll(() => linhas.allTextContents(), {
          message: 'A página de calendários não mudou após avançar; exclusão em lote interrompida.',
        })
        .not.toEqual(marcadorAnterior);
    }

    if (!encontrado) {
      if (excluidos.length === 0)
        throw new Error('Nenhum calendário com prefixo QAAUTO foi encontrado.');
      return excluidos;
    }
    await excluirCalendarioEscolar(page, encontrado);
    excluidos.push(encontrado);
  }
}
