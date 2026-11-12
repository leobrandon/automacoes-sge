import { expect, type Page } from '@playwright/test';
import { buildPeriodo, type BuildPeriodoOptions, type PeriodoData } from '../factories/periodo.factory';
import { select2 } from '../helpers/select2.helper';
import {
  abrirEdicaoPeriodo,
  linhaPeriodo,
  navegarParaAdicionarPeriodo,
  pesquisarPeriodo,
  proximaSequenciaLivrePeriodo,
  tituloConsultaPeriodo,
  voltarParaConsultaPeriodo,
} from '../helpers/navigation/periodo.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface PeriodoCriado extends PeriodoData {
  url: string;
}

/** Cria pela interface e prova a persistência na grade e reabrindo o registro. */
export async function criarPeriodo(
  page: Page,
  options: BuildPeriodoOptions = {},
  sequencia = 1,
): Promise<PeriodoCriado> {
  // Descrição repetida tornaria a conferência ambígua; usa a primeira sequência livre.
  const sequenciaLivre = await proximaSequenciaLivrePeriodo(page, options, sequencia);
  const dados = buildPeriodo(options, sequenciaLivre);
  await navegarParaAdicionarPeriodo(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao').fill(dados.descricao);
  await select2.select(page, '#DiaInicio', String(dados.diaInicio), { exactMatch: true });
  await expect(formulario.locator('#DiaInicio')).toHaveValue(String(dados.diaInicio));

  const salvar = getByRoleSge(formulario, 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByText('O período foi salvo com sucesso.', { exact: true });
  const atencao = page.getByText(/^Atenção/);
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible()) {
    const validacoes = (await formulario.locator('.field-validation-error, .state-error').allInnerTexts())
      .map((texto) => texto.trim()).filter(Boolean);
    throw new Error(
      `O SGE não aceitou o Período "${dados.descricao}" (aviso "Atenção"). `
      + `Validações visíveis: ${validacoes.join(' | ') || 'nenhuma'}.`,
    );
  }
  await expect(tituloConsultaPeriodo(page)).toBeVisible({ timeout: 20000 });

  await pesquisarPeriodo(page, dados.descricao);
  const linha = linhaPeriodo(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoPeriodo(page, dados.descricao);
  await expect(formulario.locator('#DiaInicio')).toHaveValue(String(dados.diaInicio));
  await expect(formulario.locator('#s2id_DiaInicio .select2-chosen')).toHaveText(String(dados.diaInicio));
  await voltarParaConsultaPeriodo(page);

  console.log(`[QAAUTO] Período criado e conferido: ${dados.descricao} | Dia de Início: ${dados.diaInicio}`);
  return { ...dados, url: page.url() };
}
