import {expect, type Page} from '@playwright/test';
import {buildNecessidadeNutricional, digitosDaMascara, type NecessidadeNutricionalDados} from '../factories/necessidade-nutricional.factory';
import {getByRoleSge} from '../helpers/sge-locators.helper';
import {waitForSgeLoaders} from '../helpers/navigation/common.navigation';
import {consultaNecessidade, linhaNecessidade, pesquisarNecessidade, voltarParaConsultaNecessidade} from '../helpers/navigation/necessidade-nutricional.navigation';

async function selecionar(page: Page, id: string, texto: string): Promise<void> {
  await page.locator(`#s2id_${id} .select2-choice`).click();
  const drop = page.locator('.select2-drop:visible');
  await expect(drop).toBeVisible();
  const opcoes = drop.locator('li.select2-result-selectable');
  await expect(opcoes.or(drop.locator('.select2-no-results'))).not.toHaveCount(0);
  const textos = (await opcoes.allInnerTexts()).map(x => x.trim());
  if (!textos.includes(texto)) {
    await page.keyboard.press('Escape');
    throw new Error(`${id}: opção "${texto}" indisponível. Opções: ${textos.join(' | ') || 'nenhuma'}. Verifique os dados de apoio do tenant (Resolução, Grupo de Anos Escolares).`);
  }
  const opcao = opcoes.filter({hasText: new RegExp(`^\\s*${texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)});
  await expect(opcao).toHaveCount(1);
  await opcao.click();
}

const campos: Array<[keyof NecessidadeNutricionalDados, string]> = [
  ['calorias', 'Calorias'], ['carboidratosMinimo', 'CarboidratosMinimo'], ['carboidratosMaximo', 'CarboidratosMaximo'],
  ['proteinasMinimo', 'ProteinasMinimo'], ['proteinasMaximo', 'ProteinasMaximo'],
  ['gordurasMinimo', 'GordurasTotaisMinimo'], ['gordurasMaximo', 'GordurasTotaisMaximo'],
];

export interface NecessidadeCriada { resolucao: string; grupo: string; atendimento: string }

export async function criarNecessidadeNutricional(page: Page, dados: NecessidadeNutricionalDados): Promise<NecessidadeCriada> {
  const d = buildNecessidadeNutricional(dados);
  await consultaNecessidade(page);
  const m = page.locator('#main');
  await getByRoleSge(m, 'button', {name: /Adicionar/}).click();
  await expect(m.locator('#ResolucoesId')).toBeAttached();
  await waitForSgeLoaders(page);
  await selecionar(page, 'ResolucoesId', d.resolucao);
  await selecionar(page, 'GrupoAnosEscolaresAlimentacaoId', d.grupo);
  await waitForSgeLoaders(page);
  await selecionar(page, 'TipoDeAtendimento', d.atendimento);
  for (const [chave, id] of campos) {
    const campo = m.locator(`#${id}`);
    await campo.click();
    // Máscara de centavos: digita-se somente os dígitos; fill() contornaria a máscara e gravaria valor errado.
    await campo.pressSequentially(digitosDaMascara(d[chave]));
    await expect(campo).toHaveValue(d[chave]);
  }
  const salvar = m.locator('#btnSalvar');
  await expect(salvar).toBeVisible();
  await salvar.click();
  await expect(m.locator('h4').filter({hasText: 'Editar Necessidade Nutricional'})).toBeVisible();
  await voltarParaConsultaNecessidade(page);
  await pesquisarNecessidade(page, d.resolucao);
  const linha = linhaNecessidade(page, d.resolucao, d.grupo, d.atendimento);
  await expect(linha).toHaveCount(1);
  // Colunas: seleção, Resolução, Grupo, Percentual, Calorias, Carboidratos, Proteínas, Gorduras, ações.
  await expect(linha.locator('td')).toHaveText([
    /.*/, d.resolucao, d.grupo, d.atendimento, d.calorias,
    `${d.carboidratosMinimo} - ${d.carboidratosMaximo}`,
    `${d.proteinasMinimo} - ${d.proteinasMaximo}`,
    `${d.gordurasMinimo} - ${d.gordurasMaximo}`,
    /.*/,
  ]);
  return {resolucao: d.resolucao, grupo: d.grupo, atendimento: d.atendimento};
}
