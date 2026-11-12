import type { Page } from '@playwright/test';
import {
  buildCategoriaDaTurma,
  type BuildCategoriaDaTurmaOptions,
  type CategoriaDaTurmaData,
} from '../factories/categoria-da-turma.factory';
import {
  linhaCategoriaDaTurma,
  navegarParaAdicionarCategoriaDaTurma,
  pesquisarCategoriaDaTurma,
} from '../helpers/navigation/categoria-da-turma.navigation';
import { excluirCategoriaDaTurma } from './excluir-categoria-da-turma.action';

export interface CategoriaDaTurmaCriada extends CategoriaDaTurmaData {
  url: string;
}

export async function criarCategoriaDaTurma(
  page: Page,
  options: BuildCategoriaDaTurmaOptions = {},
): Promise<CategoriaDaTurmaCriada> {
  const dados = buildCategoriaDaTurma(options);

  console.log(`\n🚀 Categoria da Turma a ser criada: "${dados.descricao}"`);

  console.log(`📝 Abrindo o formulário para cadastrar "${dados.descricao}"...`);
  await navegarParaAdicionarCategoriaDaTurma(page);
  const formulario = page.locator('#modalEditar');
  await formulario.locator('#Descricao').fill(dados.descricao);
  console.log(`💾 Salvando a Categoria da Turma "${dados.descricao}"...`);
  await formulario.locator('#btn-save').click();

  const alerta = page.locator('.swal2-popup:visible');
  await alerta.getByRole('button', { name: /^(Ok|OK)$/ }).waitFor({ state: 'visible' });
  const feedback = await alerta.innerText();
  await alerta.getByRole('button', { name: /^(Ok|OK)$/ }).click();
  if (!/sucesso/i.test(feedback)) throw new Error(`Criacao da Categoria da Turma nao confirmada: ${feedback}`);
  console.log(`✅ Categoria da Turma criada: "${dados.descricao}"`);

  try {
    await pesquisarCategoriaDaTurma(page, dados.descricao);
    const linha = linhaCategoriaDaTurma(page, dados.descricao);
    await linha.waitFor({ state: 'visible' });
    if (await linha.count() !== 1) throw new Error('A Categoria da Turma nao e unica na grade.');
    return { ...dados, url: page.url() };
  } catch (error) {
    try {
      await excluirCategoriaDaTurma(page, dados.descricao);
    } catch (cleanup) {
      throw new AggregateError([error, cleanup], `Falha na validacao e limpeza de ${dados.descricao}`);
    }
    throw error;
  }
}
