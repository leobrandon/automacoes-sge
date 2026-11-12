import { expect, type Page } from '@playwright/test';
import {
  baseNomeGrupoAlimento,
  buildGrupoAlimento,
  type BuildGrupoAlimentoOptions,
  type GrupoAlimentoData,
} from '../factories/grupo-alimento.factory';
import {
  confirmarAvisoGrupoAlimento,
  linhaGrupoAlimento,
  modalGrupoAlimento,
  navegarParaAdicionarGrupoAlimento,
  pesquisarGrupoAlimento,
} from '../helpers/navigation/grupo-alimento.navigation';

export interface GrupoAlimentoCriado extends GrupoAlimentoData {
  url: string;
}

/** O SGE recusa nome repetido: usa a primeira sequência livre a partir da pedida. */
async function proximaSequenciaLivreGrupoAlimento(
  page: Page,
  options: BuildGrupoAlimentoOptions,
  inicial: number,
): Promise<number> {
  const base = baseNomeGrupoAlimento(options);
  await pesquisarGrupoAlimento(page, base);
  const celulas = await page.locator('#main table tbody tr:visible td:first-child').allInnerTexts();
  const existentes = new Set(celulas.map((texto) => texto.trim()));

  let sequencia = inicial;
  while (existentes.has(`${base} ${sequencia}`)) sequencia++;
  return sequencia;
}

/** Cria pelo modal "Grupo de Alimento" e verifica a persistência na grade filtrada. */
export async function criarGrupoAlimento(
  page: Page,
  options: BuildGrupoAlimentoOptions = {},
  sequencia = 1,
): Promise<GrupoAlimentoCriado> {
  const livre = await proximaSequenciaLivreGrupoAlimento(page, options, sequencia);
  const dados = buildGrupoAlimento(options, livre);
  await navegarParaAdicionarGrupoAlimento(page);

  const modal = modalGrupoAlimento(page);
  await modal.locator('#Nome').fill(dados.nome);
  if (dados.descricao) await modal.locator('#Descricao').fill(dados.descricao);

  const salvar = modal.locator('#btnSalvar');
  await expect(salvar).toBeVisible();
  await salvar.click();
  await confirmarAvisoGrupoAlimento(page, /O Grupo de Alimento foi adicionado/i);
  await expect(modal).toBeHidden({ timeout: 15000 });

  await pesquisarGrupoAlimento(page, dados.nome);
  await expect(linhaGrupoAlimento(page, dados.nome)).toHaveCount(1, { timeout: 15000 });
  return { ...dados, url: page.url() };
}
