import { expect, type Locator, type Page } from '@playwright/test';
import {
  buildFuncaoConselho,
  tiposExibidosFuncaoConselho,
  type BuildFuncaoConselhoOptions,
  type FuncaoConselhoData,
} from '../factories/funcao-conselho.factory';
import { Select2Helper } from '../helpers/select2.helper';
import { getByRoleSge } from '../helpers/sge-locators.helper';
import { fecharAvisoConselho } from '../helpers/navigation/conselho-escolar.navigation';
import {
  abrirModalNovaFuncaoConselho,
  linhaFuncaoConselho,
  pesquisarFuncaoConselho,
} from '../helpers/navigation/funcao-conselho.navigation';

export interface FuncaoConselhoCriada extends FuncaoConselhoData {
  url: string;
}

async function preencherFuncao(page: Page, modal: Locator, dados: FuncaoConselhoData): Promise<void> {
  await modal.locator('#Descricao').fill(dados.descricao);
  for (const tipo of dados.tipos) {
    await Select2Helper.select(page, '.modal:visible #s2id_Tipo', tipo, { exactMatch: true, isMultiple: true });
  }
  await modal.locator('#IdadeMinima').fill(String(dados.idadeMinima));

  const ativo = modal.locator('#Ativo');
  if (await ativo.isChecked() !== (dados.ativo === 'Sim')) {
    await modal.locator('label:has(#Ativo) .toggle').click();
  }
  await expect(ativo).toBeChecked({ checked: dados.ativo === 'Sim' });
}

/**
 * Cria a função pela interface e prova a persistência na grade filtrada (descrição, tipos,
 * idade mínima e situação). Falha antes de criar se a descrição já existir (resíduo de outra
 * execução), pois o SGE aceita duplicidade e a prova ficaria ambígua.
 */
export async function criarFuncaoConselho(
  page: Page,
  options: BuildFuncaoConselhoOptions = {},
  sequencia = 1,
): Promise<FuncaoConselhoCriada> {
  const dados = buildFuncaoConselho(options, sequencia);

  await pesquisarFuncaoConselho(page, dados.descricao);
  await expect(
    linhaFuncaoConselho(page, dados.descricao),
    `Já existe "${dados.descricao}" (resíduo de outra execução). Execute a exclusão antes de criar novamente.`,
  ).toHaveCount(0);

  const modal = await abrirModalNovaFuncaoConselho(page);
  await preencherFuncao(page, modal, dados);
  await getByRoleSge(modal, 'button', { name: /Salvar/ }).click();
  await fecharAvisoConselho(page, /A função do conselho escolar foi adicionada/i);
  await expect(modal).toBeHidden({ timeout: 15000 });

  await pesquisarFuncaoConselho(page, dados.descricao);
  const linha = linhaFuncaoConselho(page, dados.descricao);
  await expect(linha).toHaveCount(1, { timeout: 15000 });
  await expect(getByRoleSge(linha, 'cell', { name: tiposExibidosFuncaoConselho(dados.tipos), exact: true })).toBeVisible();
  await expect(getByRoleSge(linha, 'cell', { name: String(dados.idadeMinima), exact: true })).toBeVisible();
  await expect(linha.locator('.fa-check')).toHaveCount(dados.ativo === 'Sim' ? 1 : 0);
  return { ...dados, url: page.url() };
}

/**
 * Confere as recusas do formulário sem persistir nada: salvar vazio, sem tipo e idade mínima 0.
 * O SGE exibe "Verifique os dados informados" e marca cada campo inválido.
 */
export async function validarRecusasFuncaoConselho(page: Page): Promise<void> {
  const modal = await abrirModalNovaFuncaoConselho(page);
  const salvar = getByRoleSge(modal, 'button', { name: /Salvar/ });

  await salvar.click();
  await fecharAvisoConselho(page, /Verifique os dados informados/i);
  await expect(modal.getByText('O tipo é obrigatório.')).toBeVisible();
  await expect(modal.getByText('A idade mínima deve ser informada.')).toBeVisible();

  await modal.locator('#Descricao').fill('QAAUTO Função Conselho Recusa');
  await Select2Helper.select(page, '.modal:visible #s2id_Tipo', 'Comunidade', { exactMatch: true, isMultiple: true });
  await modal.locator('#IdadeMinima').fill('0');
  await salvar.click();
  await fecharAvisoConselho(page, /Verifique os dados informados/i);
  await expect(modal.getByText('A idade mínima deve ser informada.')).toBeVisible();

  await getByRoleSge(modal, 'button', { name: /Fechar/ }).click();
  await expect(modal).toBeHidden({ timeout: 15000 });
}
