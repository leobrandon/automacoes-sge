import { expect, type Page } from '@playwright/test';
import {
  buildLocalAlmoxarifado,
  type BuildLocalAlmoxarifadoOptions,
  type LocalAlmoxarifadoData,
} from '../factories/local-almoxarifado.factory';
import {
  abrirEdicaoLocalAlmoxarifado,
  linhaLocalAlmoxarifado,
  navegarParaAdicionarLocalAlmoxarifado,
  pesquisarLocalAlmoxarifado,
  proximaSequenciaLivreLocalAlmoxarifado,
  tituloConsultaLocalAlmoxarifado,
  voltarParaConsultaLocalAlmoxarifado,
} from '../helpers/navigation/local-almoxarifado.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface LocalAlmoxarifadoCriado extends LocalAlmoxarifadoData {
  url: string;
}

/** Cria pela interface (campos obrigatórios) e prova a persistência na grade e reabrindo o registro. */
export async function criarLocalAlmoxarifado(
  page: Page,
  options: BuildLocalAlmoxarifadoOptions = {},
  sequencia = 1,
): Promise<LocalAlmoxarifadoCriado> {
  // O SGE aceita nomes repetidos; usa a primeira sequência livre para manter a conferência inequívoca.
  const sequenciaLivre = await proximaSequenciaLivreLocalAlmoxarifado(page, options, sequencia);
  const dados = buildLocalAlmoxarifado(options, sequenciaLivre);
  await navegarParaAdicionarLocalAlmoxarifado(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Nome').fill(dados.nome);
  await formulario.locator('#Telefone1').fill(dados.telefone);
  await formulario.locator('#NomeDoResponsavel').fill(dados.responsavel);

  const salvar = getByRoleSge(formulario, 'button', { name: /Salvar/i });
  await expect(salvar).toBeVisible();
  await salvar.click();

  const sucesso = page.getByText('Local adicionado!', { exact: true });
  const atencao = page.getByText(/^Atenção/);
  await expect(sucesso.or(atencao).first()).toBeVisible({ timeout: 20000 });
  if (await atencao.first().isVisible()) {
    const validacoes = (await formulario.locator('.field-validation-error, .state-error').allInnerTexts())
      .map((texto) => texto.trim()).filter(Boolean);
    throw new Error(
      `O SGE não aceitou o Local "${dados.nome}" (aviso "Atenção"). `
      + `Validações visíveis: ${validacoes.join(' | ') || 'nenhuma'}.`,
    );
  }
  await page.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(sucesso).toBeHidden();

  // Após salvar o SGE permanece na edição do registro recém-criado.
  await expect(getByRoleSge(formulario, 'heading', { name: /Editar local/i })).toBeVisible({ timeout: 20000 });
  await voltarParaConsultaLocalAlmoxarifado(page);
  await expect(tituloConsultaLocalAlmoxarifado(page)).toBeVisible();

  await pesquisarLocalAlmoxarifado(page, dados.nome);
  await expect(linhaLocalAlmoxarifado(page, dados.nome)).toHaveCount(1, { timeout: 15000 });

  // Reabre para conferir o que foi gravado.
  await abrirEdicaoLocalAlmoxarifado(page, dados.nome);
  await expect(formulario.locator('#Telefone1')).toHaveValue(dados.telefone);
  await expect(formulario.locator('#NomeDoResponsavel')).toHaveValue(dados.responsavel);
  await voltarParaConsultaLocalAlmoxarifado(page);

  console.log(`[QAAUTO] Local criado e conferido: ${dados.nome}`);
  return { ...dados, url: page.url() };
}
