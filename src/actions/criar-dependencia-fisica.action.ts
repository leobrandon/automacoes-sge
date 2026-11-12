import { expect, type Page } from '@playwright/test';
import {
  buildDependenciaFisica,
  type BuildDependenciaFisicaOptions,
  type DependenciaFisicaData,
} from '../factories/dependencia-fisica.factory';
import { select2 } from '../helpers/select2.helper';
import {
  abrirEdicaoDependenciaFisica,
  linhaDependenciaFisica,
  navegarParaAdicionarDependenciaFisica,
  pesquisarDependenciaFisica,
  proximaSequenciaLivreDependenciaFisica,
  tituloConsultaDependenciaFisica,
  voltarParaConsultaDependenciaFisica,
} from '../helpers/navigation/dependencia-fisica.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface DependenciaFisicaCriada extends DependenciaFisicaData {
  url: string;
}

/** Cria pela interface e prova a persistência na grade e reabrindo o registro. */
export async function criarDependenciaFisica(
  page: Page,
  options: BuildDependenciaFisicaOptions = {},
  sequencia = 1,
): Promise<DependenciaFisicaCriada> {
  // O SGE aceita descrição repetida; usa a primeira sequência livre para manter a conferência inequívoca.
  const sequenciaLivre = await proximaSequenciaLivreDependenciaFisica(page, options, sequencia);
  const dados = buildDependenciaFisica(options, sequenciaLivre);
  await navegarParaAdicionarDependenciaFisica(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao').fill(dados.descricao);
  await select2.select(page, '#TipoDeDependenciaId', dados.tipoDependencia, { exactMatch: true });
  await expect(formulario.locator('#s2id_TipoDeDependenciaId .select2-chosen')).toHaveText(dados.tipoDependencia);

  const salvar = getByRoleSge(formulario, 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByText('A dependência física foi salva com sucesso.', { exact: true });
  const atencao = page.getByText(/^Atenção/);
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible()) {
    const validacoes = (await formulario.locator('.field-validation-error, .state-error').allInnerTexts())
      .map((texto) => texto.trim()).filter(Boolean);
    throw new Error(
      `O SGE não aceitou a Dependência Física "${dados.descricao}" (aviso "Atenção"). `
      + `Validações visíveis: ${validacoes.join(' | ') || 'nenhuma'}.`,
    );
  }
  await expect(tituloConsultaDependenciaFisica(page)).toBeVisible({ timeout: 20000 });

  await pesquisarDependenciaFisica(page, dados.descricao);
  const linha = linhaDependenciaFisica(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha).toContainText(dados.tipoDependencia);

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoDependenciaFisica(page, dados.descricao);
  await expect(formulario.locator('#s2id_TipoDeDependenciaId .select2-chosen')).toHaveText(dados.tipoDependencia);
  await voltarParaConsultaDependenciaFisica(page);

  console.log(`[QAAUTO] Dependência Física criada e conferida: ${dados.descricao} | Tipo: ${dados.tipoDependencia}`);
  return { ...dados, url: page.url() };
}
