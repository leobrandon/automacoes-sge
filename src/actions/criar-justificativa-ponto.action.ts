import { expect, type Page } from '@playwright/test';
import {
  buildJustificativaPonto,
  type BuildJustificativaPontoOptions,
  type JustificativaPontoData,
  type OpcaoSimNaoJustificativaPonto,
} from '../factories/justificativa-ponto.factory';
import { select2 } from '../helpers/select2.helper';
import {
  abrirEdicaoJustificativaPonto,
  linhaJustificativaPonto,
  navegarParaAdicionarJustificativaPonto,
  pesquisarJustificativaPonto,
  proximaSequenciaLivreJustificativaPonto,
  tituloConsultaJustificativaPonto,
  voltarParaConsultaJustificativaPonto,
} from '../helpers/navigation/justificativa-ponto.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface JustificativaPontoCriada extends JustificativaPontoData {
  url: string;
}

async function definirToggle(page: Page, campo: string, valor: OpcaoSimNaoJustificativaPonto): Promise<void> {
  const controle = page.locator(`#main #${campo}`);
  const esperado = valor === 'Sim';
  if (await controle.isChecked() !== esperado) {
    await page.locator(`#main .toggle:has(#${campo})`).click();
  }
  await expect(controle).toBeChecked({ checked: esperado });
}

/** Cria pela interface e prova a persistência na grade e reabrindo o registro. */
export async function criarJustificativaPonto(
  page: Page,
  options: BuildJustificativaPontoOptions = {},
  sequencia = 1,
): Promise<JustificativaPontoCriada> {
  // O SGE aceita descrição repetida, mas isso tornaria a conferência ambígua; usa a primeira livre.
  const sequenciaLivre = await proximaSequenciaLivreJustificativaPonto(page, options, sequencia);
  const dados = buildJustificativaPonto(options, sequenciaLivre);
  await navegarParaAdicionarJustificativaPonto(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao').fill(dados.descricao);
  await formulario.locator('#Sigla').fill(dados.sigla);
  await formulario.locator('#Codigo').fill(dados.codigo);
  await formulario.locator('#Prazo').fill(dados.prazo);
  await select2.select(page, '#TipoJustificativa', dados.tipo, { exactMatch: true });
  await definirToggle(page, 'DisponivelParaUnidades', dados.disponivelParaUnidades);
  await definirToggle(page, 'DisponivelParaPreFolha', dados.disponivelNaPreFolha);

  const salvar = getByRoleSge(formulario, 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByText('Justificativa salva com sucesso.', { exact: true });
  const atencao = page.getByText('Atenção!', { exact: true });
  await expect(sucesso.or(atencao)).toBeVisible({ timeout: 20000 });
  if (await atencao.isVisible()) {
    const validacoes = (await formulario.locator('.field-validation-error, .state-error').allInnerTexts())
      .map((texto) => texto.trim()).filter(Boolean);
    throw new Error(
      `O SGE não aceitou a Justificativa de Ponto "${dados.descricao}" (aviso "Atenção!"). `
      + `Validações visíveis: ${validacoes.join(' | ') || 'nenhuma'}.`,
    );
  }
  await expect(tituloConsultaJustificativaPonto(page)).toBeVisible({ timeout: 20000 });

  await pesquisarJustificativaPonto(page, dados.descricao);
  const linha = linhaJustificativaPonto(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha).toContainText(dados.sigla);
  await expect(linha).toContainText(dados.tipo);

  // Reabre para conferir os campos que a grade não exibe (pré-folha) e o que foi gravado.
  await abrirEdicaoJustificativaPonto(page, dados.descricao);
  await expect(formulario.locator('#Sigla')).toHaveValue(dados.sigla);
  await expect(formulario.locator('#Codigo')).toHaveValue(dados.codigo);
  await expect(formulario.locator('#Prazo')).toHaveValue(dados.prazo);
  await expect(formulario.locator('#s2id_TipoJustificativa .select2-chosen')).toHaveText(dados.tipo);
  await expect(formulario.locator('#DisponivelParaUnidades')).toBeChecked({ checked: dados.disponivelParaUnidades === 'Sim' });
  await expect(formulario.locator('#DisponivelParaPreFolha')).toBeChecked({ checked: dados.disponivelNaPreFolha === 'Sim' });
  await voltarParaConsultaJustificativaPonto(page);

  return { ...dados, url: page.url() };
}
