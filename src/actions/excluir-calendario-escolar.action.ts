import { expect, type Page } from '@playwright/test';
import {
  linhaCalendarioEscolar,
  pesquisarCalendarioEscolar,
} from '../helpers/navigation/calendario-escolar.navigation';
export async function excluirCalendarioEscolar(page: Page, nome: string): Promise<string> {
  const alvo = nome.trim();
  if (!/^QAAUTO\b/i.test(alvo)) throw new Error('A exclusão exige descrição QAAUTO.');
  await pesquisarCalendarioEscolar(page, alvo);
  const linha = linhaCalendarioEscolar(page, alvo);
  await expect(linha).toHaveCount(1);
  const rotaEdicao = await linha.locator('input[name="url"]').inputValue();
  const id = rotaEdicao.match(/\/editar\/(\d+)$/i)?.[1];
  if (!id) throw new Error(`Não foi possível identificar o calendário "${alvo}" na grade.`);
  const [carregamento] = await Promise.all([
    page.waitForResponse((resposta) => {
      const url = new URL(resposta.url());
      return url.pathname.toLowerCase() === '/calendarioescolar/getcalculamescalendarioescolar' &&
        url.searchParams.get('calendarioId') === id && resposta.request().method() === 'GET';
    }, { timeout: 30000 }),
    linha.click(),
  ]);
  if (!carregamento.ok()) throw new Error(`O carregamento do calendário retornou HTTP ${carregamento.status()}.`);
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
