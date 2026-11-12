import { expect, type Page } from '@playwright/test';
import {
  buildCargo,
  type BuildCargoOptions,
  type CargoData,
} from '../factories/cargo.factory';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { navegarParaAdicionarCargo } from '../helpers/navigation/cargo.navigation';

export interface CargoCriado extends CargoData {
  url: string;
}

type IndicadorCargo = 'DisponivelSomenteParaContratosEfetivos' | 'ExigeNivelSuperior';

async function definirIndicadorOpcional(
  page: Page,
  id: IndicadorCargo,
  esperado: boolean,
): Promise<boolean | undefined> {
  const campo = page.locator(`#main #${id}`);
  if (await campo.count() === 0) {
    if (esperado) throw new Error(`O indicador opcional "${id}" não está disponível nesta configuração.`);
    return undefined;
  }

  const controleVisivel = page.locator(`#main label:has(#${id}) .toggle`);
  if (!await campo.isEnabled() || !await controleVisivel.isVisible()) {
    const valorAtual = await campo.isChecked();
    if (esperado && !valorAtual) {
      throw new Error(`O indicador "${id}" está indisponível e não corresponde ao valor solicitado.`);
    }
    return valorAtual;
  }

  if (await campo.isChecked() !== esperado) {
    await expect(controleVisivel).toBeVisible();
    await controleVisivel.click();
  }
  await expect(campo).toBeChecked({ checked: esperado });
  return esperado;
}

async function conferirIndicador(
  page: Page,
  id: IndicadorCargo,
  esperado: boolean | undefined,
): Promise<void> {
  if (esperado === undefined) return;
  await expect(page.locator(`#main #${id}`)).toBeChecked({ checked: esperado });
}

/** Cria um Cargo pela interface e confirma que o formulário entrou em edição. */
export async function criarCargo(
  page: Page,
  options: BuildCargoOptions,
  sequencia = Date.now(),
): Promise<CargoCriado> {
  const dados = buildCargo(options, sequencia);
  await navegarParaAdicionarCargo(page);

  const formulario = page.locator('#main');
  await formulario.locator('#Descricao').fill(dados.descricao);
  await formulario.locator('#Tipo').selectOption({ label: dados.tipo });

  const somenteEfetivos = await definirIndicadorOpcional(
    page,
    'DisponivelSomenteParaContratosEfetivos',
    dados.somenteEfetivos,
  );
  const formacaoSuperior = await definirIndicadorOpcional(
    page,
    'ExigeNivelSuperior',
    dados.formacaoSuperior,
  );
  if (dados.atividadesEDeveres) {
    await formulario.locator('#AtividadesEDeveres').fill(dados.atividadesEDeveres);
  }

  const [resposta] = await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname.toLocaleLowerCase('pt-BR') === '/cargo/posteditar'
        && response.request().method() === 'POST';
    }, { timeout: 20000 }),
    getByRoleSge(formulario, 'button', { name: /Salvar/i }).click(),
  ]);
  if (!resposta.ok()) {
    throw new Error(`O salvamento do Cargo retornou HTTP ${resposta.status()}.`);
  }

  await expect(getByRoleSge(formulario, 'heading', { name: /Editar Cargo/i }))
    .toBeVisible({ timeout: 20000 });
  await expect(formulario.locator('#Descricao')).toHaveValue(dados.descricao);
  await expect(formulario.locator('#Tipo option:checked')).toHaveText(dados.tipo);
  await conferirIndicador(page, 'DisponivelSomenteParaContratosEfetivos', somenteEfetivos);
  await conferirIndicador(page, 'ExigeNivelSuperior', formacaoSuperior);

  const criado: CargoCriado = {
    ...dados,
    somenteEfetivos: somenteEfetivos ?? dados.somenteEfetivos,
    formacaoSuperior: formacaoSuperior ?? dados.formacaoSuperior,
    url: page.url(),
  };
  console.log(`[QAAUTO] Cargo salvo em edição: ${criado.descricao} | Tipo: ${criado.tipo}`);
  return criado;
}
