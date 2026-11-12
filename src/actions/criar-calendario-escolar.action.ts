import { expect, type Page } from '@playwright/test';
import {
  buildCalendarioEscolar,
  type CalendarioEscolarOpcoes,
} from '../factories/calendario-escolar.factory';
import { datepicker } from '../helpers/datepicker.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  consultaCalendarioEscolar,
  linhaCalendarioEscolar,
  pesquisarCalendarioEscolar,
} from '../helpers/navigation/calendario-escolar.navigation';
export async function criarCalendarioEscolar(
  page: Page,
  opcoes: CalendarioEscolarOpcoes,
  sequencia = 1,
): Promise<string> {
  const d = buildCalendarioEscolar(opcoes, sequencia),
    m = page.locator('#main');
  await consultaCalendarioEscolar(page);
  const adicionar = getByRoleSge(m, 'button', { name: /Adicionar/ });
  await expect(adicionar).toBeVisible();
  await adicionar.click();
  await expect(m.locator('#Descricao')).toBeVisible();
  const ano = m.locator('#AnoLetivoId');
  const anos = await ano.locator('option').allTextContents();
  if (!anos.map((x) => x.trim()).includes(d.anoLetivo))
    throw new Error(`Ano letivo ${d.anoLetivo} indisponível. Opções: ${anos.join(' | ')}.`);
  await ano.selectOption({ label: d.anoLetivo });
  await m.locator('#TipoCalendario').selectOption({ label: 'Bimestral' });
  await m.locator('#Descricao').fill(d.descricao);
  for (const [id, valor] of Object.entries(d.datas)) await datepicker.fill(page, `#${id}`, valor);
  const salvar = getByRoleSge(m, 'button', { name: /Salvar/ });
  await expect(salvar).toBeVisible();
  const [r] = await Promise.all([
    page.waitForResponse(
      (r) =>
        /^\/calendarioescolar\/editar\/\d+$/i.test(new URL(r.url()).pathname) &&
        r.request().method() === 'GET',
      { timeout: 30000 },
    ),
    salvar.click(),
  ]);
  if (!r.ok()) throw new Error(`Edição do calendário criado retornou HTTP ${r.status()}.`);
  await expect(m.locator('#Descricao')).toHaveValue(d.descricao);
  await pesquisarCalendarioEscolar(page, d.descricao);
  await expect(linhaCalendarioEscolar(page, d.descricao)).toHaveCount(1);
  return d.descricao;
}
