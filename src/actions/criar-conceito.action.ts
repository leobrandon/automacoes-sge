import { expect, type Page } from '@playwright/test';
import { buildConceito, type BuildConceitoOptions, type ConceitoData } from '../factories/conceito.factory';
import {
  linhaConceito,
  navegarParaAdicionarConceito,
  pesquisarConceito,
} from '../helpers/navigation/conceito.navigation';
import { getByRoleSge } from '../helpers/sge-locators.helper';

export interface ConceitoCriado extends ConceitoData {
  url: string;
}

async function definirOpcao(page: Page, id: 'Aprovar' | 'Ativo', valor: 'Sim' | 'Não'): Promise<void> {
  const controle = page.locator(`#main #${id}`);
  const esperado = valor === 'Sim';
  if (await controle.isChecked() !== esperado) {
    await page.locator(`#main label:has(#${id}) .toggle`).click();
  }
  await expect(controle).toBeChecked({ checked: esperado });
}

/** Cria um Conceito pela interface e confirma sua persistência na grade. */
export async function criarConceito(
  page: Page,
  options: BuildConceitoOptions = {},
  sequencia = 1,
): Promise<ConceitoCriado> {
  const dados = buildConceito(options, sequencia);
  console.log(`📝 Iniciando criação do Conceito: ${dados.descricao}`);
  await navegarParaAdicionarConceito(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Sigla').fill(dados.sigla);
  await formulario.locator('#ValorMinimo').fill(dados.valorMinimo);
  await formulario.locator('#ValorMaximo').fill(dados.valorMaximo);
  await formulario.locator('#Descricao').fill(dados.descricao);
  await definirOpcao(page, 'Aprovar', dados.aprovar);
  await definirOpcao(page, 'Ativo', dados.ativo);

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const caminho = new URL(response.url()).pathname.toLowerCase().replace(/\/$/, '');
      return caminho === '/conceito/posteditar' && response.request().method() === 'POST';
    }, { timeout: 20000 }),
    formulario.getByRole('button', { name: /Salvar/i, includeHidden: true }).click(),
  ]);
  if (!resposta.ok()) throw new Error(`O cadastro do Conceito retornou HTTP ${resposta.status()}.`);

  const feedback = page.getByRole('dialog').filter({
    has: page.getByRole('button', { name: 'Ok', exact: true }),
  });
  await expect(feedback).toBeVisible({ timeout: 20000 });
  const mensagem = (await feedback.innerText()).trim();
  await feedback.getByRole('button', { name: 'Ok', exact: true }).click();
  await expect(feedback).toBeHidden({ timeout: 15000 });
  if (!/O conceito foi salvo com sucesso\./i.test(mensagem)) {
    throw new Error(`O SGE não confirmou o cadastro do Conceito: ${mensagem}`);
  }

  const voltar = getByRoleSge(formulario, 'button', { name: /Voltar/i });
  await expect(voltar).toBeVisible();
  await voltar.click();
  await formulario.getByRole('heading', { name: /Consulta de Conceitos/i, includeHidden: true })
    .waitFor({ state: 'visible', timeout: 20000 });
  await pesquisarConceito(page, dados.descricao);
  const linha = linhaConceito(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(linha.getByRole('cell', { name: dados.descricao, exact: true, includeHidden: true })).toBeVisible();
  console.log(`✅ Conceito criado e mantido: ${dados.descricao}`);
  return { ...dados, url: page.url() };
}
