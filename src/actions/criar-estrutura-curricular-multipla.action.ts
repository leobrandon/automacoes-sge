import { expect, type Page } from '@playwright/test';
import {
  buildEstruturaCurricular,
  type EstruturaCurricularDados,
} from '../factories/estrutura-curricular-multipla.factory';
import { datepicker } from '../helpers/datepicker.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import {
  consultaEstruturaCurricular,
  linhaEstruturaCurricular,
  pesquisarEstruturaCurricular,
} from '../helpers/navigation/estrutura-curricular-multipla.navigation';

async function selecionar(page: Page, id: string, texto: string, apoio: string): Promise<void> {
  const container = page.locator(`#s2id_${id}`);
  await expect(container).toBeVisible();
  await container.locator('.select2-choice').click();
  const drop = page.locator('#select2-drop:visible');
  await expect(drop).toBeVisible();
  const opcoes = drop.locator('li.select2-result-selectable');
  await expect(opcoes.or(drop.locator('.select2-no-results'))).not.toHaveCount(0);
  const textos = (await opcoes.allInnerTexts()).map((t) => t.trim()).filter(Boolean);
  if (!textos.includes(texto)) {
    await page.keyboard.press('Escape');
    throw new Error(
      textos.length
        ? `${apoio} "${texto}" não encontrado. Opções: ${textos.join(' | ')}.`
        : `Nenhum ${apoio} disponível; cadastre-o antes de executar.`,
    );
  }
  await opcoes.getByText(texto, { exact: true }).click();
  await expect(container.locator('.select2-chosen')).toHaveText(texto);
}

export async function criarEstruturaCurricularMultipla(
  page: Page,
  dados: EstruturaCurricularDados,
  sequencia = 1,
  aoCriar?: (descricao: string) => void,
): Promise<string> {
  const d = buildEstruturaCurricular(dados, sequencia);
  const main = page.locator('#main');
  await consultaEstruturaCurricular(page);
  await getByRoleSge(main, 'button', { name: /Adicionar/ }).click();
  await expect(main.locator('#Descricao')).toBeVisible();
  await main.locator('#Descricao').fill(d.descricao);
  await selecionar(page, 'NivelDeEnsino', d.nivel, 'nível de ensino');
  await selecionar(page, 'TipoEstruturaCurricularId', d.tipo, 'tipo de estrutura curricular');
  await datepicker.fill(page, '#DataDaResolucao', d.dataResolucao);
  await main.locator('#NumeroDaResolucao').fill(d.numeroResolucao);
  await main.locator('#btn-save').click();
  const sucesso = page
    .getByRole('dialog')
    .filter({ hasText: 'Estrutura Curricular Múltipla adicionada' });
  await expect(sucesso).toBeVisible();
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(main.locator('#Descricao')).toHaveValue(d.descricao);
  aoCriar?.(d.descricao);
  await main.locator('a[href="#tabGrades"]').click();
  for (const grade of d.grades) {
    const [modal] = await Promise.all([
      page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname.toLowerCase().endsWith('/obtenhamodalparaadicionar') &&
          r.request().method() === 'GET',
      ),
      main.locator('#tabGrades button[onclick="adicionarEstrutura()"]').click(),
    ]);
    if (!modal.ok()) throw new Error(`Modal de grade retornou HTTP ${modal.status()}.`);
    const dialog = page.locator('#modalEstruturaCreate:visible');
    await expect(dialog).toBeVisible();
    const [componentes] = await Promise.all([
      page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname.toLowerCase().endsWith('/obtenhadisciplinas') &&
          r.request().method() === 'GET',
      ),
      selecionar(page, 'SerieId', grade.anoEscolar, 'ano escolar'),
    ]);
    if (!componentes.ok())
      throw new Error(`Consulta de componentes retornou HTTP ${componentes.status()}.`);
    await dialog.getByText('Próximo', { exact: true }).click();
    await expect(dialog.locator('#tab2')).toBeVisible();
    await selecionar(page, 'DisciplinaId', grade.componente, 'componente curricular');
    await dialog.getByText('Próximo', { exact: true }).click();
    await expect(dialog.locator('#tab3')).toBeVisible();
    await dialog.locator('#CargaHoraria').fill(grade.cargaHoraria);
    await dialog.locator('#AulasSemanais').fill(grade.aulasSemanais);
    await dialog.locator('#AulasPresenciais').fill(grade.aulasPresenciais);
    await dialog.locator('#AulasNaoPresenciais').fill(grade.aulasNaoPresenciais);
    const [salvar] = await Promise.all([
      page.waitForResponse(
        (r) =>
          new URL(r.url()).pathname.toLowerCase().endsWith('/postnovagrade') &&
          r.request().method() === 'POST',
      ),
      dialog.getByText('Salvar', { exact: true }).click(),
    ]);
    if (!salvar.ok()) throw new Error(`Cadastro de grade retornou HTTP ${salvar.status()}.`);
    await expect(dialog).toBeHidden();
    await expect(
      main.locator('#tabGrades').getByText(grade.anoEscolar.split(' - ')[0], { exact: false }),
    ).toBeVisible();
    await expect(
      main.locator('#tabGrades table:visible').getByText(grade.componente, { exact: true }),
    ).toBeVisible();
  }
  await pesquisarEstruturaCurricular(page, d.descricao);
  await expect(linhaEstruturaCurricular(page, d.descricao)).toHaveCount(1);
  await linhaEstruturaCurricular(page, d.descricao).click();
  await expect(main.locator('#Descricao')).toHaveValue(d.descricao);
  await main.locator('a[href="#tabGrades"]').click();
  for (const grade of d.grades) {
    const ano = grade.anoEscolar.split(' - ')[0];
    const aba = main.locator('#tabGrades a').filter({ hasText: ano });
    await expect(aba).toBeVisible();
    await aba.click();
    const linha = main
      .locator('#tabGrades table:visible tr')
      .filter({ has: page.getByText(grade.componente, { exact: true }) });
    await expect(linha).toHaveCount(1);
    await expect(linha).toContainText(grade.cargaHoraria);
    await expect(linha).toContainText(grade.aulasSemanais);
  }
  return d.descricao;
}
