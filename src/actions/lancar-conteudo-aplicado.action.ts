import { expect, type Page } from '@playwright/test';
import { datepicker, select2 } from '../helpers';
import { navegarParaConteudoAplicado } from '../helpers/navigation/conteudo-aplicado.navigation';
import { entrarNaUnidadeEscolar } from '../helpers/navigation/conselho-escolar.navigation';

export interface ConteudoAplicadoLancamentoDados {
  escola: string;
  turma: string;
  dataAula: string;
  componenteCurricular: string;
  habilidades: string;
  objetosConhecimento: string;
}

export function validarDadosConteudoAplicado(dados: ConteudoAplicadoLancamentoDados): void {
  for (const campo of ['escola', 'turma', 'dataAula', 'componenteCurricular', 'habilidades', 'objetosConhecimento'] as const) {
    if (typeof dados[campo] !== 'string' || !dados[campo].trim()) {
      throw new Error(`Informe "${campo}" nos dados do teste de Conteúdo Aplicado.`);
    }
  }
  if (dados.dataAula !== 'atual' && !/^\d{2}\/\d{2}\/\d{4}$/.test(dados.dataAula)) {
    throw new Error('"dataAula" deve estar no formato DD/MM/AAAA.');
  }
}

/** Lança um Conteúdo Aplicado no formulário de Escola > Conteúdo Aplicado. */
export async function lancarConteudoAplicado(page: Page, dados: ConteudoAplicadoLancamentoDados): Promise<{ id: string; data: string }> {
  validarDadosConteudoAplicado(dados);
  await entrarNaUnidadeEscolar(page, dados.escola);
  if (!await page.locator('#formConteudoAplicado').isVisible()) await navegarParaConteudoAplicado(page);
  await select2.select(page, '#s2id_SelecaoDeTurma', dados.turma, { exactMatch: true });
  const abaListagem = page.locator('#tabConteudos a[href="#s1"]');
  await abaListagem.click();
  const buscaRegistros = page.locator('#tabelaConteudoAplicado_wrapper input[type="search"]');
  await buscaRegistros.fill(dados.habilidades);
  const linhas = page.locator('#tabelaConteudoAplicado tbody tr[id^="linha-conteudo_"]');
  const idsAnteriores = await linhas.evaluateAll((rows) => rows.map((row) => row.id));
  await page.locator('#div-acoes-personalizadas-conteudo button').filter({ hasText: 'Adicionar' }).click({ timeout: 20000 });

  const modal = page.locator('#formAddConteudo');
  await expect(modal).toBeVisible();
  await expect(modal.locator('#s2id_SelecaoDeTurma .select2-chosen')).toHaveText(dados.turma);
  const hoje = new Date();
  const data = dados.dataAula === 'atual'
    ? `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`
    : dados.dataAula;
  let respostasFormulario = 0;
  const respostaFormulario = page.waitForResponse((resposta) => {
    if (new URL(resposta.url()).pathname.toLowerCase() !== '/conteudo/partialadicionar'
      || resposta.request().method() !== 'GET') return false;
    respostasFormulario++;
    return respostasFormulario === 2;
  }, { timeout: 30000 });
  await datepicker.fill(page, '#formAddConteudo #DataAula', data, { dispatchEvents: false });
  const resposta = await respostaFormulario;
  if (!resposta.ok()) throw new Error(`Carregamento do formulário retornou HTTP ${resposta.status()}.`);
  await expect(modal.locator('#skeleton-loader-page')).toBeHidden({ timeout: 30000 });
  await select2.select(page, '[id="formAddConteudo"] #s2id_GradeEscolarId', dados.componenteCurricular, { exactMatch: true });
  await modal.locator('#ItemDoAgrupador_57690').fill(dados.habilidades);
  await modal.locator('#ItemDoAgrupador_57691').fill(dados.objetosConhecimento);

  await expect(modal.locator('#DataAula')).toHaveValue(data);
  await expect(modal.locator('#ItemDoAgrupador_57690')).toHaveValue(dados.habilidades);
  await expect(modal.locator('#ItemDoAgrupador_57691')).toHaveValue(dados.objetosConhecimento);
  await page.locator('#grupo-salvar-enviar button').filter({ hasText: 'Salvar' }).click();
  const sucesso = page.locator('.swal2-popup:visible').filter({ hasText: 'Dados salvos com sucesso!' });
  await expect(sucesso).toBeVisible({ timeout: 30000 });
  await sucesso.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(modal).toBeHidden({ timeout: 30000 });
  await abaListagem.click();
  await buscaRegistros.fill(dados.habilidades);
  let idsNovos: string[] = [];
  await expect.poll(async () => {
    const ids = await linhas.evaluateAll((rows) => rows.map((row) => row.id));
    idsNovos = ids.filter((id) => !idsAnteriores.includes(id));
    return idsNovos.length;
  }, { message: 'A listagem deve mostrar um novo registro após o salvamento.', timeout: 30000 }).toBe(1);
  const linha = page.locator(`[id="${idsNovos[0]}"]`);
  await expect(linha).toContainText(data);
  await expect(linha).toContainText(dados.componenteCurricular);
  await expect(linha).toContainText(dados.habilidades);
  await expect(linha).toContainText(dados.objetosConhecimento);
  return { id: idsNovos[0], data };
}
